#!/bin/bash
# Script principal para desplegar toda la aplicación en AWS
echo "✅ Script iniciado"

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_message() {
  echo -e "${2}${1}${NC}"
}

# Función para mostrar ayuda
show_help() {
  echo "Uso: $0 [opciones]"
  echo ""
  echo "Opciones:"
  echo "  -h, --help                Muestra esta ayuda"
  echo "  -s, --stack-name NOMBRE   Nombre del stack de CloudFormation (default: kpi-dashboard)"
  echo "  -r, --region REGIÓN       Región de AWS (default: us-east-1)"
  echo "  -e, --env ENTORNO         Entorno de despliegue (dev, test, prod) (default: dev)"
  echo "  -a, --admin-email EMAIL   Email del administrador para notificaciones"
  echo "  --skip-frontend           Omitir la construcción y despliegue del frontend"
  echo ""
}

# Parámetros
STACK_NAME="kpi-dashboard"
REGION="us-east-1"
ENVIRONMENT="dev"
ADMIN_EMAIL=""
SKIP_FRONTEND=false

# Procesar argumentos
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -h|--help)
      show_help
      exit 0
      ;;
    -s|--stack-name)
      STACK_NAME="$2"
      shift
      shift
      ;;
    -r|--region)
      REGION="$2"
      shift
      shift
      ;;
    -e|--env)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    -a|--admin-email)
      ADMIN_EMAIL="$2"
      shift
      shift
      ;;
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    *)
      print_message "Opción desconocida: $1" "$RED"
      show_help
      exit 1
      ;;
  esac
done

# Solicitar parámetros obligatorios si no se proporcionaron
if [ -z "$ADMIN_EMAIL" ]; then
  print_message "Ingresa el email del administrador para notificaciones:" "$YELLOW"
  read ADMIN_EMAIL
  if [ -z "$ADMIN_EMAIL" ]; then
    print_message "El email del administrador es obligatorio." "$RED"
    exit 1
  fi
fi

# Verificar si los scripts necesarios existen
SCRIPT_DIR="$(dirname "$0")"
PREPARE_LAMBDA_SCRIPT="$SCRIPT_DIR/prepare-lambda.sh"
DEPLOY_BACKEND_SCRIPT="$SCRIPT_DIR/deploy-backend.sh"
DEPLOY_FRONTEND_SCRIPT="$SCRIPT_DIR/deploy-frontend.sh"

if [ ! -f "$PREPARE_LAMBDA_SCRIPT" ] || [ ! -f "$DEPLOY_BACKEND_SCRIPT" ] || [ ! -f "$DEPLOY_FRONTEND_SCRIPT" ]; then
  print_message "No se encontraron todos los scripts necesarios en $SCRIPT_DIR" "$RED"
  exit 1
fi

# Verificar si el stack existe
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].StackStatus" --output text --region $REGION 2>/dev/null || echo "STACK_NOT_EXIST")
print_message "Estado de la pila $STACK_NAME: $STACK_STATUS" "$YELLOW"

# Si el stack no existe, crearlo
if [[ "$STACK_STATUS" == "STACK_NOT_EXIST" ]]; then
  print_message "La pila $STACK_NAME no existe. Creando nueva pila..." "$YELLOW"
  
  # Crear archivo temporal con el template CloudFormation
  CF_TEMPLATE_FILE="../infrastructure/cloudformation-kpis.json"
  
  # Crear el directorio si no existe
  mkdir -p "../infrastructure"
  
  # Guardar el JSON en el archivo
  cat > "$CF_TEMPLATE_FILE" << 'EOL'
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "KPI Dashboard - Infraestructura completa para visualización de KPIs operativos",
  "Parameters": {
    "Environment": {
      "Type": "String",
      "Default": "dev",
      "AllowedValues": ["dev", "test", "prod"],
      "Description": "Entorno de despliegue"
    },
    "DomainName": {
      "Type": "String",
      "Description": "Nombre de dominio para el frontend (ej. kpi-dashboard.example.com)",
      "Default": "kpi-dashboard.example.com"
    },
    "CertificateArn": {
      "Type": "String",
      "Description": "ARN del certificado SSL para CloudFront (opcional)",
      "Default": ""
    },
    "AdminEmail": {
      "Type": "String",
      "Description": "Email del administrador para notificaciones",
      "Default": "admin@example.com"
    }
  },
  "Conditions": {
    "HasCertificate": {
      "Fn::Not": [
        {
          "Fn::Equals": [
            {
              "Ref": "CertificateArn"
            },
            ""
          ]
        }
      ]
    }
  },
  "Resources": {
    "FrontendBucket": {
      "Type": "AWS::S3::Bucket",
      "DeletionPolicy": "Delete",
      "Properties": {
        "BucketName": {
          "Fn::Sub": "${Environment}-kpi-dashboard-frontend"
        },
        "AccessControl": "Private",
        "PublicAccessBlockConfiguration": {
          "BlockPublicAcls": true,
          "BlockPublicPolicy": true,
          "IgnorePublicAcls": true,
          "RestrictPublicBuckets": true
        },
        "BucketEncryption": {
          "ServerSideEncryptionConfiguration": [
            {
              "ServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
              }
            }
          ]
        },
        "VersioningConfiguration": {
          "Status": "Enabled"
        },
        "Tags": [
          {
            "Key": "Environment",
            "Value": {
              "Ref": "Environment"
            }
          }
        ]
      }
    },
    "CSVBucket": {
      "Type": "AWS::S3::Bucket",
      "DeletionPolicy": "Retain",
      "Properties": {
        "BucketName": {
          "Fn::Sub": "${Environment}-kpi-dashboard-csv"
        },
        "AccessControl": "Private",
        "PublicAccessBlockConfiguration": {
          "BlockPublicAcls": true,
          "BlockPublicPolicy": true,
          "IgnorePublicAcls": true,
          "RestrictPublicBuckets": true
        },
        "BucketEncryption": {
          "ServerSideEncryptionConfiguration": [
            {
              "ServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
              }
            }
          ]
        },
        "LifecycleConfiguration": {
          "Rules": [
            {
              "Id": "TransitionToInfrequentAccess",
              "Status": "Enabled",
              "Transitions": [
                {
                  "TransitionInDays": 30,
                  "StorageClass": "STANDARD_IA"
                }
              ]
            }
          ]
        },
        "CorsConfiguration": {
          "CorsRules": [
            {
              "AllowedHeaders": ["*"],
              "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
              "AllowedOrigins": ["*"],
              "MaxAge": 3600
            }
          ]
        },
        "Tags": [
          {
            "Key": "Environment",
            "Value": {
              "Ref": "Environment"
            }
          }
        ]
      }
    },
    "CloudFrontOriginAccessIdentity": {
      "Type": "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      "Properties": {
        "CloudFrontOriginAccessIdentityConfig": {
          "Comment": {
            "Fn::Sub": "OAI for ${Environment} KPI Dashboard"
          }
        }
      }
    },
    "FrontendDistribution": {
      "Type": "AWS::CloudFront::Distribution",
      "Properties": {
        "DistributionConfig": {
          "Origins": [
            {
              "DomainName": {
                "Fn::GetAtt": ["FrontendBucket", "RegionalDomainName"]
              },
              "Id": "S3Origin",
              "S3OriginConfig": {
                "OriginAccessIdentity": {
                  "Fn::Sub": "origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}"
                }
              }
            }
          ],
          "Enabled": true,
          "DefaultRootObject": "index.html",
          "HttpVersion": "http2",
          "PriceClass": "PriceClass_100",
          "ViewerCertificate": {
            "CloudFrontDefaultCertificate": true
          },
          "DefaultCacheBehavior": {
            "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
            "CachedMethods": ["GET", "HEAD", "OPTIONS"],
            "Compress": true,
            "DefaultTTL": 86400,
            "ForwardedValues": {
              "QueryString": false,
              "Cookies": {
                "Forward": "none"
              }
            },
            "TargetOriginId": "S3Origin",
            "ViewerProtocolPolicy": "redirect-to-https"
          },
          "CustomErrorResponses": [
            {
              "ErrorCode": 404,
              "ResponseCode": 200,
              "ResponsePagePath": "/index.html"
            },
            {
              "ErrorCode": 403,
              "ResponseCode": 200,
              "ResponsePagePath": "/index.html"
            }
          ]
        },
        "Tags": [
          {
            "Key": "Environment",
            "Value": {
              "Ref": "Environment"
            }
          }
        ]
      }
    },
    "FrontendBucketPolicy": {
      "Type": "AWS::S3::BucketPolicy",
      "Properties": {
        "Bucket": {
          "Ref": "FrontendBucket"
        },
        "PolicyDocument": {
          "Statement": [
            {
              "Action": ["s3:GetObject"],
              "Effect": "Allow",
              "Resource": {
                "Fn::Sub": "${FrontendBucket.Arn}/*"
              },
              "Principal": {
                "CanonicalUser": {
                  "Fn::GetAtt": ["CloudFrontOriginAccessIdentity", "S3CanonicalUserId"]
                }
              }
            }
          ]
        }
      }
    },
    "UsersTable": {
      "Type": "AWS::DynamoDB::Table",
      "Properties": {
        "TableName": {
          "Fn::Sub": "${Environment}-kpi-dashboard-users"
        },
        "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [
          {
            "AttributeName": "userId",
            "AttributeType": "S"
          },
          {
            "AttributeName": "email",
            "AttributeType": "S"
          }
        ],
        "KeySchema": [
          {
            "AttributeName": "userId",
            "KeyType": "HASH"
          }
        ],
        "GlobalSecondaryIndexes": [
          {
            "IndexName": "EmailIndex",
            "KeySchema": [
              {
                "AttributeName": "email",
                "KeyType": "HASH"
              }
            ],
            "Projection": {
              "ProjectionType": "ALL"
            }
          }
        ],
        "PointInTimeRecoverySpecification": {
          "PointInTimeRecoveryEnabled": true
        },
        "SSESpecification": {
          "SSEEnabled": true
        },
        "Tags": [
          {
            "Key": "Environment",
            "Value": {
              "Ref": "Environment"
            }
          }
        ]
      }
    },
    "KPIDataTable": {
      "Type": "AWS::DynamoDB::Table",
      "Properties": {
        "TableName": {
          "Fn::Sub": "${Environment}-kpi-dashboard-data"
        },
        "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [
          {
            "AttributeName": "id",
            "AttributeType": "S"
          },
          {
            "AttributeName": "date",
            "AttributeType": "S"
          },
          {
            "AttributeName": "category",
            "AttributeType": "S"
          }
        ],
        "KeySchema": [
          {
            "AttributeName": "id",
            "KeyType": "HASH"
          }
        ],
        "GlobalSecondaryIndexes": [
          {
            "IndexName": "DateIndex",
            "KeySchema": [
              {
                "AttributeName": "date",
                "KeyType": "HASH"
              }
            ],
            "Projection": {
              "ProjectionType": "ALL"
            }
          },
          {
            "IndexName": "CategoryIndex",
            "KeySchema": [
              {
                "AttributeName": "category",
                "KeyType": "HASH"
              }
            ],
            "Projection": {
              "ProjectionType": "ALL"
            }
          }
        ],
        "PointInTimeRecoverySpecification": {
          "PointInTimeRecoveryEnabled": true
        },
        "SSESpecification": {
          "SSEEnabled": true
        },
        "Tags": [
          {
            "Key": "Environment",
            "Value": {
              "Ref": "Environment"
            }
          }
        ]
      }
    },
    "ConfigTable": {
      "Type": "AWS::DynamoDB::Table",
      "Properties": {
        "TableName": {
          "Fn::Sub": "${Environment}-kpi-dashboard-config"
        },
        "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [
          {
            "AttributeName": "configId",
            "AttributeType": "S"
          },
          {
            "AttributeName": "userId",
            "AttributeType": "S"
          }
        ],
        "KeySchema": [
          {
            "AttributeName": "configId",
            "KeyType": "HASH"
          }
        ],
        "GlobalSecondaryIndexes": [
          {
            "IndexName": "UserConfigIndex",
            "KeySchema": [
              {
                "AttributeName": "userId",
                "KeyType": "HASH"
              }
            ],
            "Projection": {
              "ProjectionType": "ALL"
            }
          }
        ],
        "PointInTimeRecoverySpecification": {
          "PointInTimeRecoveryEnabled": true
        },
        "SSESpecification": {
          "SSEEnabled": true
        },
        "Tags": [
          {
            "Key": "Environment",
            "Value": {
              "Ref": "Environment"
            }
          }
        ]
      }
    },
    "NotificationTopic": {
      "Type": "AWS::SNS::Topic",
      "Properties": {
        "TopicName": {
          "Fn::Sub": "${Environment}-kpi-dashboard-notifications"
        },
        "DisplayName": "KPI Dashboard Notifications",
        "Tags": [
          {
            "Key": "Environment",
            "Value": {
              "Ref": "Environment"
            }
          }
        ]
      }
    },
    "NotificationSubscription": {
      "Type": "AWS::SNS::Subscription",
      "Properties": {
        "Protocol": "email",
        "Endpoint": {
          "Ref": "AdminEmail"
        },
        "TopicArn": {
          "Ref": "NotificationTopic"
        }
      }
    }
  },
  "Outputs": {
    "FrontendURL": {
      "Description": "URL del frontend",
      "Value": {
        "Fn::Sub": "https://${FrontendDistribution.DomainName}"
      }
    },
    "FrontendBucketName": {
      "Description": "Nombre del bucket S3 para el frontend",
      "Value": {
        "Ref": "FrontendBucket"
      }
    },
    "CSVBucketName": {
      "Description": "Nombre del bucket S3 para archivos CSV",
      "Value": {
        "Ref": "CSVBucket"
      }
    }
  }
}
EOL

  # Crear el stack
  print_message "Creando stack de CloudFormation..." "$YELLOW"
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$CF_TEMPLATE_FILE" \
    --parameters ParameterKey=Environment,ParameterValue="$ENVIRONMENT" ParameterKey=AdminEmail,ParameterValue="$ADMIN_EMAIL" \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --region "$REGION"
  
  # Esperar a que se complete la creación
  print_message "Esperando a que se complete la creación del stack..." "$YELLOW"
  aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
  
  if [ $? -ne 0 ]; then
    print_message "Error al crear el stack de CloudFormation. Mostrando eventos del stack:" "$RED"
    aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --region "$REGION" --query 'StackEvents[?contains(ResourceStatus, `FAILED`) == `true`].[LogicalResourceId,ResourceStatus,ResourceStatusReason]' --output table
    exit 1
  fi
  
  print_message "Stack de CloudFormation creado exitosamente!" "$GREEN"
else
  print_message "Usando stack existente: $STACK_NAME" "$GREEN"
fi

# Paso 1: Preparar los archivos Lambda
print_message "Paso 1: Preparando los archivos Lambda..." "$YELLOW"
$PREPARE_LAMBDA_SCRIPT

if [ $? -ne 0 ]; then
  print_message "Error al preparar los archivos Lambda." "$RED"
  exit 1
fi

# Paso 2: Desplegar el backend
print_message "Paso 2: Desplegando el backend..." "$YELLOW"
$DEPLOY_BACKEND_SCRIPT

if [ $? -ne 0 ]; then
  print_message "Error al desplegar el backend." "$RED"
  exit 1
fi

# Paso 3: Configurar el frontend para evitar errores de ESLint
print_message "Paso 3: Configurando el frontend..." "$YELLOW"
cd ../frontend
echo "SKIP_PREFLIGHT_CHECK=true" >> .env
cd - > /dev/null

# Paso 4: Desplegar el frontend (si no se omitió)
if [ "$SKIP_FRONTEND" = false ]; then
  print_message "Paso 4: Desplegando el frontend..." "$YELLOW"
  $DEPLOY_FRONTEND_SCRIPT --stack-name "$STACK_NAME" --region "$REGION" --env "$ENVIRONMENT"
  
  if [ $? -ne 0 ]; then
    print_message "Error al desplegar el frontend." "$RED"
    exit 1
  fi
fi

print_message "¡Despliegue completo! La aplicación estará disponible en unos minutos." "$GREEN"

# Obtener la URL del frontend
FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" --output text --region "$REGION")
if [ ! -z "$FRONTEND_URL" ] && [ "$FRONTEND_URL" != "None" ]; then
  print_message "URL del frontend: $FRONTEND_URL" "$GREEN"
else
  FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text --region "$REGION")
  print_message "URL del frontend: https://$FRONTEND_BUCKET.s3.$REGION.amazonaws.com/index.html" "$GREEN"
fi

print_message "Credenciales de administrador:" "$GREEN"
echo "Email: $ADMIN_EMAIL"
echo "Contraseña: Verifica en la salida del script de despliegue"
echo ""
print_message "IMPORTANTE: Deberás cambiar esta contraseña en el primer inicio de sesión" "$YELLOW"
