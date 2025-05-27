import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Divider, useTheme, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Card, CardContent } from '@mui/material';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import { apiService, csvService } from '../services/serviceConfig';
import { mondayService } from '../services/mondayService';
import KPICard from './KPICard';

// Colores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const MONDAY_BOARD_ID = "2205761827";

// Nombres más cortos para las categorías (para mostrar en gráficos)
const CATEGORY_SHORT_NAMES = {
  'Ventas por Tienda y Division': 'Ventas Tienda',
  'Ventas Presidencia': 'Ventas Pres.',
  'Operativo Diario': 'Op. Diario',
  'Indicadores Presidencia': 'Ind. Pres.',
  'Tendencia Firme / No Firme': 'Tendencias',
  'Ventas Viajes Palacio': 'Viajes',
  'Ventas Restaurantes': 'Restaurantes',
  'Operativo Mensual': 'Op. Mensual',
  'Operativo Fin de Semana y Semanal': 'Op. Semanal',
  'Operativo Anual': 'Op. Anual'
};

// Función para formatear fechas ISO a formato DD/MM/YYYY
const formatDate = (dateInput) => {
  if (!dateInput) return '';

  try {
    const dateStr = dateInput.toString().trim();

    // Si ya está en formato DD/MM/YYYY, devolverlo tal como está
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    // Si está en formato ISO YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }

    // Si está en formato DD-MM-YYYY (con guiones)
    if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const [day, month, year] = dateStr.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    // Intentar parsear como Date y formatear
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

    // Si nada funciona, devolver tal como está
    console.warn('No se pudo formatear la fecha:', dateStr);
    return dateStr;

  } catch (e) {
    console.error('Error al formatear fecha:', e);
    return dateInput.toString();
  }
};

const Dashboard = ({ userConfig }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState('month');
  const [error, setError] = useState(null);
  const [mondayLoading, setMondayLoading] = useState(false);
  const [lastMondaySync, setLastMondaySync] = useState(null);
  const [mondayColumnMapping, setMondayColumnMapping] = useState(null);
  const [shouldLoadData, setShouldLoadData] = useState(false);
  const [mondayCategoryMapping, setMondayCategoryMapping] = useState(null);
  const [visibleWidgets, setVisibleWidgets] = useState({
    kpiCards: true,
    trendChart: true,
    barChart: true
  });

  // Estados para el modal de selección de fechas
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [shouldLoadInitialData, setShouldLoadInitialData] = useState(true);
  const [trendReady, setTrendReady] = useState(false);



  // Aplicar configuración de usuario
  useEffect(() => {
    if (userConfig && userConfig.dashboard && userConfig.dashboard.visibleWidgets) {
      const configWidgets = {};
      userConfig.dashboard.visibleWidgets.forEach(widget => {
        configWidgets[widget] = true;
      });
      setVisibleWidgets({
        kpiCards: false,
        trendChart: false,
        barChart: false,
        ...configWidgets
      });
    }
  }, [userConfig]);

  // Cargar datos de Monday.com automáticamente al iniciar
  useEffect(() => {
    loadMondayData();
  }, []);

  useEffect(() => {
    if (
      shouldLoadInitialData &&
      summary &&
      mondayCategoryMapping &&
      !loading &&
      !mondayLoading
    ) {
      loadData();
      setShouldLoadInitialData(false); // Evita el bucle
    }
  }, [shouldLoadInitialData, summary, mondayCategoryMapping, loading, mondayLoading]);


  // Efecto para cargar datos cuando cambia el período o el rango personalizado
  useEffect(() => {
    if (summary && !mondayLoading && !loading) {
      loadData();
    }
  }, [period, customDateRange]);

  // Efecto separado para manejar la carga forzada de datos
  useEffect(() => {
    if (shouldLoadData && summary && !mondayLoading && !loading) {
      loadData();
      setShouldLoadData(false); // Reset flag
    }
  }, [shouldLoadData]);



  const processMondayData = (boardData) => {
    const categoryMapping = {};

    if (boardData && boardData.items_page && boardData.items_page.items) {
      boardData.items_page.items.forEach((item) => {
        if (item.column_values && item.name) {
          // Filtrar solo las columnas de tipo status (KPI) que tienen valores
          const statusColumns = item.column_values.filter(col => {
            // Basado en el playground: las columnas status tienen text: "OK", "NO", "N/A"
            return col.text && (col.text === "OK" || col.text === "NO" || col.text === "N/A");
          });

          if (statusColumns.length > 0) {
            const categoryData = statusColumns.map(col => ({
              columnId: col.id,
              columnTitle: col.column.title, // Usar el title real de Monday.com
              categoryName: mapColumnIdToCategoryName(col.id), // Mapear a nombre estándar
              status: col.text
            }));

            // La fecha viene en item.name (ej: "01-05-2025")
            categoryMapping[item.name] = categoryData;
          }
        }
      });
    }

    return categoryMapping;
  };

  // ===== MODIFICAR loadMondayData PARA USAR LAS FUNCIONES OPTIMIZADAS =====

  const loadMondayData = async () => {
    setMondayLoading(true);
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener datos del tablero
      const boardData = await mondayService.getBoardData(MONDAY_BOARD_ID);

      // 2. Procesar datos con mapeo correcto
      const categoryMapping = processMondayData(boardData);

      // ✅ GUARDAR EN EL ESTADO
      setMondayCategoryMapping(categoryMapping);

      // 3. Obtener mapeo de columnas (opcional, ya que ahora extraemos directamente)
      const columnMapping = await mondayService.getColumnMapping(MONDAY_BOARD_ID);
      setMondayColumnMapping(columnMapping);

      // 4. Importar datos al dashboard
      const importResult = await mondayService.importToDashboard(MONDAY_BOARD_ID, categoryMapping);

      // 5. Actualizar timestamp de sincronización
      setLastMondaySync(new Date());

      // 6. Cargar los datos procesados
      await loadData();

    } catch (error) {
      setError(`Error al sincronizar con Monday.com: ${error.message}`);
    } finally {
      setMondayLoading(false);
      setLoading(false);
    }
  };

  const mapColumnIdToCategoryName = (columnId) => {
    const columnIdMapping = {
      "status": "Ventas por Tienda y Division",
      "dup__of_operativo_diario": "Ventas Presidencia",
      "dup__of_ventas_por_tienda_y_division": "Operativo Diario",
      "dup__of_ventas_presidencia": "Indicadores Presidencia",
      "dup__of_indicadores_presidencia": "Tendencia Firme / No Firme",
      "ventas_viajes_palacio": "Ventas Viajes Palacio",
      "ventas_restaurantes": "Ventas Restaurantes",
      "dup__of_tendencia_firme___no_firme__ecommerce__outlet": "Operativo Mensual",
      "dup__of_operativo_mensual": "Operativo Fin de Semana y Semanal",
      "dup__of_operativo_fin_de_semana_y_semanal": "Operativo Anual",
    };

    return columnIdMapping[columnId] || columnId;
  };

  const getExactCategoriesWithNO = (date, mondayCategoryMapping) => {
    if (!mondayCategoryMapping) {
      return [];
    }

    // Basado en el playground, las fechas están en formato DD-MM-YYYY (ej: "01-05-2025")
    // Pero los datos de filteredTrend pueden venir en formato ISO (YYYY-MM-DD)

    let possibleDateFormats = [];

    // Si la fecha viene en formato ISO (2025-05-01)
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-');
      // Convertir a formato DD-MM-YYYY que usa Monday.com
      possibleDateFormats.push(`${day}-${month}-${year}`);
      // También probar sin ceros iniciales
      possibleDateFormats.push(`${parseInt(day)}-${parseInt(month)}-${year}`);
      // Formato DD/MM/YYYY
      possibleDateFormats.push(`${day}/${month}/${year}`);
    }

    // Si la fecha viene en formato DD/MM/YYYY 
    if (date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = date.split('/');
      // Convertir a formato DD-MM-YYYY
      possibleDateFormats.push(`${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`);
      possibleDateFormats.push(`${day}-${month}-${year}`);
    }

    // También intentar con la fecha original
    possibleDateFormats.push(date);

    let categoriesWithNO = [];
    let foundDate = null;


    // Buscar la fecha en el mapeo
    for (const dateFormat of possibleDateFormats) {
      if (mondayCategoryMapping[dateFormat]) {
        foundDate = dateFormat;
        break;
      }
    }

    if (foundDate) {
      const dayData = mondayCategoryMapping[foundDate];

      // Extraer categorías con status "NO"
      dayData.forEach(categoryData => {
        const { columnId, categoryName, status } = categoryData;

        // Filtrar solo las columnas KPI (tipo status) y que tengan "NO"
        if (status === 'NO' &&
          categoryName &&
          categoryName !== 'Name' &&
          categoryName !== 'Commentario' &&
          categoryName !== 'Subelementos') {

          categoriesWithNO.push(categoryName);
        }
      });
    } else {
      // Mostrar fechas disponibles para debugging
      const availableDates = Object.keys(mondayCategoryMapping || {}).slice(0, 10);
    }

    return categoriesWithNO;
  };

  const loadData = async () => {

    if (mondayLoading) {
      return;
    }

    setLoading(true);
    setError(null);
    try {

      // Calcular fechas según el período
      const { startDate, endDate } = calculateDateRange(period);

      // ✅ SOLUCIÓN 3: Limpiar datos filtrados antes de la nueva carga
      setSummary(prev => {
        if (prev) {
          return {
            ...prev,
            filteredTrend: [],
            filteredOkCount: 0,
            filteredNoCount: 0,
            filteredNaCount: 0,
            filteredTotalRecords: 0,
            filteredComplianceRate: "0.00"
          };
        }
        return prev;
      });

      // Obtener datos de KPI
      const response = await csvService.getKPISummary(startDate, endDate);

      if (response && response.summary) {
        // Asegurarse de que los datos de tendencia existan y tengan el formato correcto
        const processedSummary = {
          ...response.summary,
          trend: Array.isArray(response.summary.trend) ? response.summary.trend : []
        };

        // Asegurarse de que cada elemento de la tendencia tenga una fecha y tasa de cumplimiento
        if (processedSummary.trend.length > 0) {
          processedSummary.trend = processedSummary.trend.filter(item => item && item.date);
        }

        // Si no hay datos de tendencia, intentar generarlos a partir de byDate
        if (processedSummary.trend.length === 0 && processedSummary.byDate) {
          const trendFromByDate = Object.entries(processedSummary.byDate).map(([date, data]) => ({
            date,
            complianceRate: parseFloat(data.complianceRate || 0),
            ok: data.ok || 0,
            no: data.no || 0,
            na: data.na || 0
          }));

          if (trendFromByDate.length > 0) {
            processedSummary.trend = trendFromByDate;
          }
        }

        // Encontrar la fecha más reciente en los datos
        let maxDate = endDate;
        if (processedSummary.trend.length > 0) {
          try {
            // Ordenar las fechas y tomar la más reciente
            const sortedDates = [...processedSummary.trend]
              .filter(item => item && item.date)
              .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (sortedDates.length > 0) {
              maxDate = sortedDates[0].date;
            }
          } catch (error) {
            console.error('Error al determinar la fecha más reciente:', error);
            maxDate = endDate;
          }
        }

        // ✅ FILTRAR datos por el período seleccionado
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        // Extraer datos por categoría para cada día
        const categoryDataByDay = {}
        if (processedSummary.byCategory) {
          Object.keys(processedSummary.byCategory).forEach(category => {
            categoryDataByDay[category] = {};
          });
        }

        const filteredTrend = processedSummary.trend.filter(item => {
          if (!item.date) return false;

          try {
            let itemDate;

            // Si la fecha está en formato DD/MM/YYYY (como viene de Monday.com)
            if (item.date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
              const [day, month, year] = item.date.split('/');
              itemDate = new Date(year, month - 1, day);
            }
            // Si está en formato ISO YYYY-MM-DD
            else if (item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              itemDate = new Date(item.date);
            }
            // Si está en formato DD-MM-YYYY
            else if (item.date.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
              const [day, month, year] = item.date.split('-');
              itemDate = new Date(year, month - 1, day);
            }
            // Otros formatos
            else {
              itemDate = new Date(item.date);
            }

            // Verificar que la fecha es válida
            if (isNaN(itemDate.getTime())) {
              console.warn(`Fecha inválida: ${item.date}`);
              return false;
            }

            // ✅ NORMALIZAR fechas de comparación - quitar horas/minutos/segundos
            const normalizedItemDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
            const normalizedStartDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
            const normalizedEndDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());

            // ✅ COMPARAR fechas normalizadas
            const isInRange = normalizedItemDate >= normalizedStartDate && normalizedItemDate <= normalizedEndDate;

            return isInRange;

          } catch (error) {
            console.warn(`Error al procesar fecha: ${item.date}`, error);
            return false;
          }
        });

        if (filteredTrend.length > 0) {
          // Sumar todos los OK y NO de cada día en el período
          let totalOk = 0;
          let totalNo = 0;
          let totalNa = 0;

          // Crear estructura para almacenar datos por categoría
          const categoryTotals = {};

          filteredTrend.forEach(item => {
            totalOk += (item.ok || 0);
            totalNo += (item.no || 0);
            totalNa += (item.na || 0);

            // Extraer datos por categoría si están disponibles
            if (item.byCategory) {
              Object.entries(item.byCategory).forEach(([category, counts]) => {
                if (!categoryTotals[category]) {
                  categoryTotals[category] = { ok: 0, no: 0, na: 0 };
                }
                categoryTotals[category].ok += (counts.ok || 0);
                categoryTotals[category].no += (counts.no || 0);
                categoryTotals[category].na += (counts.na || 0);
              });
            }

            // Si no hay datos de categoría en el item pero hay datos en el resumen global
            else if (item.date && processedSummary.byDate && processedSummary.byDate[item.date]) {
              const dayData = processedSummary.byDate[item.date];
              if (dayData.byCategory) {
                Object.entries(dayData.byCategory).forEach(([category, counts]) => {
                  if (!categoryTotals[category]) {
                    categoryTotals[category] = { ok: 0, no: 0, na: 0 };
                  }
                  categoryTotals[category].ok += (counts.ok || 0);
                  categoryTotals[category].no += (counts.no || 0);
                  categoryTotals[category].na += (counts.na || 0);
                });
              }
            }
          });

          const totalRecords = filteredTrend.filter(item =>
            item.ok > 0 || item.no > 0 || item.na > 0
          ).length;

          // Calcular tasa de cumplimiento
          const complianceRate = totalOk + totalNo > 0 ?
            (totalOk / (totalOk + totalNo) * 100).toFixed(2) : "0.00";
          // ===== PASO 2: ESTRATEGIA ALTERNATIVA BASADA EN LOS DATOS REALES =====

          // Dado que no tenemos byCategory a nivel diario, necesitamos extraer las categorías
          // directamente de los datos CSV originales o crear una lógica alternativa

          const enrichedTrend = filteredTrend.map((item, index) => {
            let categoriesWithNO = [];
            let categoryDetails = [];

            // ✅ USAR DATOS EXACTOS DE MONDAY.COM
            if (item.no > 0 && mondayCategoryMapping) {

              // Extraer categorías exactas
              categoriesWithNO = getExactCategoriesWithNO(item.date, mondayCategoryMapping);
              if (categoriesWithNO.length > 0) {
                // Crear categoryDetails
                categoryDetails = categoriesWithNO.map(category => ({
                  name: category,
                  ok: 0,
                  no: Math.max(1, Math.floor(item.no / categoriesWithNO.length)),
                  na: 0,
                  rate: "0.0"
                }));
              }
            }

            return {
              ...item,
              categoriesWithNO,
              categoryDetails,
              hasIncumplimientos: categoriesWithNO.length > 0
            };
          });

          // ===== PASO 6: ANÁLISIS DE RESULTADOS MEJORADO =====
          const analyzeExactResults = () => {
            const categoryDistribution = {};
            const exactMatches = 0;
            const fallbackMatches = 0;

            enrichedTrend.forEach(item => {
              if (item.categoriesWithNO) {
                item.categoriesWithNO.forEach(cat => {
                  categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
                });
              }
            });
            if (mondayCategoryMapping) {
              const totalDatesInMonday = Object.keys(mondayCategoryMapping).length;
            }

            // Mostrar ejemplos
            const examples = enrichedTrend
              .filter(item => item.categoriesWithNO && item.categoriesWithNO.length > 0)
              .slice(0, 5);
          };

          analyzeExactResults();

          // Actualizar el resumen con los datos filtrados
          processedSummary.filteredTrend = enrichedTrend;
          processedSummary.filteredOkCount = totalOk;
          processedSummary.filteredNoCount = totalNo;
          processedSummary.filteredNaCount = totalNa;
          processedSummary.filteredTotalRecords = totalRecords;
          processedSummary.filteredComplianceRate = complianceRate;
          processedSummary.filteredByCategory = categoryTotals;
        } else {
          // Si no hay datos en el período, establecer valores en cero
          processedSummary.filteredTrend = [];
          processedSummary.filteredOkCount = 0;
          processedSummary.filteredNoCount = 0;
          processedSummary.filteredNaCount = 0;
          processedSummary.filteredTotalRecords = 0;
          processedSummary.filteredComplianceRate = "0.00";

          // Inicializar filteredByCategory con los mismos datos de byCategory pero con valores en cero
          const emptyCategoryTotals = {};
          if (processedSummary.byCategory) {
            Object.keys(processedSummary.byCategory).forEach(category => {
              emptyCategoryTotals[category] = { ok: 0, no: 0, na: 0 };
            });
          }
          processedSummary.filteredByCategory = emptyCategoryTotals;
        }

        setSummary(processedSummary);
        setTrendReady(true);  // ✅ Marca que los datos ya están listos
      } else {
        // console.error('Respuesta de API incompleta:', response);
        setError('La respuesta de la API no contiene los datos esperados');
      }
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      setError(`Error al cargar datos: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateDateRange = (period) => {
    // Si hay un rango de fechas personalizado, usarlo CON VALIDACIÓN
    if (period === 'custom' && customDateRange) {
      // ✅ Validar que las fechas personalizadas estén en el rango de datos disponibles
      if (summary && summary.trend && summary.trend.length > 0) {
        // Obtener el rango real de datos disponibles
        const allDates = summary.trend
          .map(item => {
            if (!item.date) return null;
            let dateObj;
            if (item.date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
              const [day, month, year] = item.date.split('/');
              dateObj = new Date(year, month - 1, day);
            } else if (item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              dateObj = new Date(item.date);
            } else {
              dateObj = new Date(item.date);
            }
            return isNaN(dateObj.getTime()) ? null : dateObj;
          })
          .filter(date => date !== null)
          .sort((a, b) => a - b);

        if (allDates.length > 0) {
          const earliestDate = allDates[0];
          const latestDate = allDates[allDates.length - 1];

          // Convertir fechas personalizadas a Date objects para validar
          const customStart = new Date(customDateRange.startDate);
          const customEnd = new Date(customDateRange.endDate);

          // Ajustar si están fuera del rango de datos disponibles
          const adjustedStart = customStart < earliestDate ? earliestDate :
            customStart > latestDate ? latestDate : customStart;
          const adjustedEnd = customEnd > latestDate ? latestDate :
            customEnd < earliestDate ? earliestDate : customEnd;

          const result = {
            startDate: adjustedStart.toISOString().split('T')[0],
            endDate: adjustedEnd.toISOString().split('T')[0]
          };

          return result;
        }
      }

      // Si no hay datos para validar, usar las fechas tal como están
      return customDateRange;
    }

    // ✅ Si tenemos datos de tendencia, usar el rango real de los datos
    if (summary && summary.trend && summary.trend.length > 0) {
      // Obtener todas las fechas de los datos y ordenarlas
      const allDates = summary.trend
        .map(item => {
          if (!item.date) return null;

          // Convertir fecha a Date object para comparar
          let dateObj;
          if (item.date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [day, month, year] = item.date.split('/');
            dateObj = new Date(year, month - 1, day);
          } else if (item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateObj = new Date(item.date);
          } else {
            dateObj = new Date(item.date);
          }

          return isNaN(dateObj.getTime()) ? null : dateObj;
        })
        .filter(date => date !== null)
        .sort((a, b) => a - b);

      if (allDates.length === 0) {
        console.warn('No se encontraron fechas válidas en los datos');
        return { startDate: '2024-01-01', endDate: '2024-12-31' };
      }

      const earliestDate = allDates[0];
      const latestDate = allDates[allDates.length - 1];

      let startDate, endDate;

      switch (period) {
        case 'week':
          // Últimos 7 días de datos disponibles
          endDate = new Date(latestDate);
          startDate = new Date(latestDate);
          startDate.setDate(startDate.getDate() - 6);
          break;

        case 'month':
          // Últimos 30 días de datos disponibles
          endDate = new Date(latestDate);
          startDate = new Date(latestDate);
          startDate.setDate(startDate.getDate() - 29);
          break;

        case 'quarter':
          // Últimos 90 días de datos disponibles
          endDate = new Date(latestDate);
          startDate = new Date(latestDate);
          startDate.setDate(startDate.getDate() - 89);
          break;

        case 'year':
          // Todos los datos disponibles
          startDate = new Date(earliestDate);
          endDate = new Date(latestDate);
          break;

        default:
          // Últimos 30 días por defecto
          endDate = new Date(latestDate);
          startDate = new Date(latestDate);
          startDate.setDate(startDate.getDate() - 29);
      }

      // Asegurar que no vamos antes del primer dato disponible
      if (startDate < earliestDate) {
        startDate = new Date(earliestDate);
      }

      const result = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      return result;
    }

    // ✅ Fallback: usar fecha actual si no hay datos aún
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(today.getDate() - 6);
        endDate = new Date(today);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        endDate = new Date(today);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        endDate = new Date(today);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        endDate = new Date(today);
        break;
      default:
        startDate.setMonth(today.getMonth() - 1);
        endDate = new Date(today);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Funciones para manejar el modal de selección de fechas
  const handleOpenDateDialog = () => {
    // Inicializar fechas con el rango actual
    const { startDate, endDate } = calculateDateRange(period);
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setDateDialogOpen(true);
  };

  const handleCloseDateDialog = () => {
    setDateDialogOpen(false);
  };

  // ✅ SOLUCIÓN 4: Mejorar la aplicación de fechas personalizadas
  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      alert('Por favor, seleccione ambas fechas');
      return;
    }

    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    const newRange = {
      startDate: customStartDate,
      endDate: customEndDate
    };

    // ✅ Cerrar diálogo primero
    setDateDialogOpen(false);

    // ✅ Actualizar estados de forma coordinada
    setCustomDateRange(newRange);
    setPeriod('custom');
    setShouldLoadData(true); // Flag para forzar carga
  };

  // ✅ SOLUCIÓN 5: Mejorar el cambio de período
  const handlePeriodChange = (event) => {
    const newPeriod = event.target.value;
    setPeriod(newPeriod);

    // ✅ Limpiar customDateRange si no es personalizado
    if (newPeriod !== 'custom') {
      setCustomDateRange(null);
    }

    // ✅ Forzar carga de datos
    setShouldLoadData(true);
  };

  // Preparar datos para gráficos según el período seleccionado
  const prepareCategoryData = () => {
    if (!summary || !summary.byCategory) {
      return [];
    }

    // Filtrar categorías no deseadas
    const excludedCategories = ['Item ID (auto generated)', 'Item ID (autogenerated)', 'Item ID', 'ID'];

    // Usar datos filtrados si están disponibles
    if (summary.filteredByCategory) {

      // Usar directamente los datos filtrados por categoría
      const categoryData = {};

      // Inicializar categorías con los datos filtrados
      Object.entries(summary.filteredByCategory)
        .filter(([category]) => !excludedCategories.includes(category))
        .forEach(([category, counts]) => {
          categoryData[category] = {
            ok: counts.ok || 0,
            no: counts.no || 0,
            na: counts.na || 0
          };
        });

      // Convertir a formato para gráfico
      const data = Object.entries(categoryData)
        .map(([category, counts]) => {
          const total = counts.ok + counts.no;
          const complianceRate = total > 0 ? (counts.ok / total) * 100 : 0;

          return {
            name: CATEGORY_SHORT_NAMES[category] || category,
            fullName: category,
            ok: counts.ok,
            no: counts.no,
            na: counts.na,
            complianceRate: complianceRate
          };
        });

      return data;
    }

    // Si no hay datos filtrados, usar los datos totales con factor de escala
    const { startDate, endDate } = calculateDateRange(period);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Si no pudimos filtrar por fecha (datos insuficientes), usar los datos totales
    const totalDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
    const allDays = Object.keys(summary.byDate || {}).length || 30;
    const scaleFactor = totalDays / allDays;

    const data = Object.entries(summary.byCategory)
      .filter(([category]) => !excludedCategories.includes(category))
      .map(([category, data]) => {
        let ok = data.ok;
        let no = data.no;
        let na = data.na;

        if (period !== 'year' && scaleFactor < 0.9) {
          ok = Math.round(data.ok * scaleFactor);
          no = Math.round(data.no * scaleFactor);
          na = Math.round(data.na * scaleFactor);
        }

        const total = ok + no;
        const complianceRate = total > 0 ? (ok / total) * 100 : 0;

        return {
          name: CATEGORY_SHORT_NAMES[category] || category,
          fullName: category,
          ok: ok,
          no: no,
          na: na,
          complianceRate: complianceRate
        };
      });

    return data;
  };

  const prepareTrendData = () => {
    // ✅ USAR los datos ya enriquecidos de summary.filteredTrend
    if (summary && summary.filteredTrend && Array.isArray(summary.filteredTrend) && summary.filteredTrend.length > 0) {

      return summary.filteredTrend.map(item => ({
        formattedDate: formatDate(item.date),
        complianceRate: parseFloat(item.complianceRate) || 0,
        ok: item.ok || 0,
        no: item.no || 0,
        na: item.na || 0,
        comment: item.comment || '',

        // ✅ DATOS DE CATEGORÍAS YA CALCULADOS EN loadData()
        categoriesWithNO: item.categoriesWithNO || [],
        categoryDetails: item.categoryDetails || [],

        // Datos adicionales para el tooltip
        hasIncumplimientos: (item.categoriesWithNO && item.categoriesWithNO.length > 0) || item.no > 0
      }));
    }

    // Fallback: Si no hay datos filtrados, usar datos vacíos
    return [];
  };

  // Determinar el color de la barra según la tasa de cumplimiento
  const getBarColor = (complianceRate) => {
    return complianceRate >= 96 ? '#4caf50' : '#f44336';
  };

  // Renderizar tooltip personalizado para mostrar el nombre completo de la categoría
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0 }}><strong>Categoría:</strong> {data.fullName || data.name}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              <strong>{entry.name}:</strong> {entry.name.includes('%') ? `${entry.value.toFixed(1)}%` : entry.value}
            </p>
          ))}
          <p style={{ margin: 0, color: '#4caf50' }}><strong>Cumplimientos:</strong> {data.ok}</p>
          <p style={{ margin: 0, color: '#f44336' }}><strong>Incumplimientos:</strong> {data.no}</p>
        </div>
      );
    }
    return null;
  };

  if (loading || mondayLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          {mondayLoading ? 'Sincronizando con Monday.com...' : 'Cargando datos...'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadMondayData}>
          Reintentar Sincronización
        </Button>
      </Box>
    );
  }

  if (!summary || summary.totalRecords === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          No hay datos disponibles para mostrar. Verifique la configuración de Monday.com.
        </Alert>
        <Button variant="contained" onClick={loadMondayData}>
          Sincronizar con Monday.com
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Estado de conexión con Monday.com */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                📊 Conectado a Monday.com
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tablero ID: {MONDAY_BOARD_ID}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Button
                variant="outlined"
                onClick={loadMondayData}
                disabled={mondayLoading}
                startIcon={mondayLoading ? <CircularProgress size={16} /> : '🔄'}
                size="small"
              >
                Sincronizar
              </Button>
              {lastMondaySync && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Última sync: {lastMondaySync.toLocaleString()}
                </Typography>
              )}
            </Box>
          </Box>

          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Los datos se sincronizan automáticamente desde Monday.com y se procesan para el dashboard.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Selector de período */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard de KPIs Operativos
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={period}
              label="Período"
              onChange={handlePeriodChange}
            >
              <MenuItem value="week">Última semana</MenuItem>
              <MenuItem value="month">Último mes</MenuItem>
              <MenuItem value="quarter">Último trimestre</MenuItem>
              <MenuItem value="year">Último año</MenuItem>
              {customDateRange && (
                <MenuItem value="custom">Personalizado</MenuItem>
              )}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={handleOpenDateDialog}
            size="small"
          >
            Personalizar fechas
          </Button>
        </Box>
      </Box>

      {/* Modal para selección de fechas */}
      <Dialog open={dateDialogOpen} onClose={handleCloseDateDialog}>
        <DialogTitle>Seleccionar rango de fechas</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: '300px' }}>
            <TextField
              label="Fecha de inicio"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Fecha de fin"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDateDialog}>Cancelar</Button>
          <Button onClick={handleApplyCustomDates} variant="contained">Aplicar</Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ mb: 3 }} />

      {/* Panel principal */}
      <Grid container spacing={3}>
        {/* Tarjetas de KPI */}
        {visibleWidgets.kpiCards && (
          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Tasa de Cumplimiento"
                  value={summary && summary.filteredComplianceRate ?
                    `${summary.filteredComplianceRate}%` :
                    (summary ? `${summary.complianceRate}%` : '0%')}
                  icon="compliance"
                  color="#4caf50"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Total de Días"
                  value={summary && summary.filteredTotalRecords ?
                    summary.filteredTotalRecords :
                    (summary ? summary.totalRecords : 0)}
                  icon="total"
                  color="#2196f3"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Cumplimientos"
                  value={summary && summary.filteredOkCount !== undefined ?
                    summary.filteredOkCount :
                    (summary ? summary.okCount : 0)}
                  icon="check"
                  color="#8bc34a"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Incumplimientos"
                  value={summary && summary.filteredNoCount !== undefined ?
                    summary.filteredNoCount :
                    (summary ? summary.noCount : 0)}
                  icon="error"
                  color="#f44336"
                />
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Gráfico de tendencias - Ocupa todo el ancho */}
        {visibleWidgets.trendChart && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Tendencia de Cumplimiento ({period === 'week' ? 'Última semana' :
                  period === 'month' ? 'Último mes' :
                    period === 'quarter' ? 'Último trimestre' :
                      period === 'year' ? 'Último año' :
                        period === 'custom' && customDateRange ?
                          `${formatDate(customDateRange.startDate)} - ${formatDate(customDateRange.endDate)}` :
                          'Período personalizado'})
              </Typography>
              {trendReady && prepareTrendData().length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart
                    key={`chart-${period}-${customDateRange ? JSON.stringify(customDateRange) : 'no-custom'}-${Date.now()}`}
                    data={prepareTrendData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="formattedDate"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={period === 'week' ? 0 : period === 'month' ? 6 : period === 'quarter' ? 14 : 30}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 96, 100]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const formattedDate = data.formattedDate;
                          const comment = data.comment;
                          const categoriesWithNO = data.categoriesWithNO || [];
                          const hasIncumplimientos = data.no > 0;

                          return (
                            <div style={{
                              backgroundColor: '#fff',
                              padding: '12px',
                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                              fontSize: '13px',
                              maxWidth: '320px',
                              lineHeight: '1.4'
                            }}>
                              {/* Fecha */}
                              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px' }}>
                                📅 {formattedDate}
                              </p>

                              {/* Tasa de cumplimiento */}
                              <p style={{ margin: '0 0 8px 0' }}>
                                <span style={{ fontWeight: 'bold' }}>📊 Tasa de Cumplimiento:</span>
                                <span style={{
                                  color: data.complianceRate >= 90 ? '#4caf50' : data.complianceRate >= 70 ? '#ff9800' : '#f44336',
                                  fontWeight: 'bold',
                                  marginLeft: '4px'
                                }}>
                                  {data.complianceRate ? `${data.complianceRate.toFixed(1)}%` : 'N/A'}
                                </span>
                              </p>

                              {/* ✅ CATEGORÍAS CON INCUMPLIMIENTOS */}
                              {hasIncumplimientos && categoriesWithNO && categoriesWithNO.length > 0 && (
                                <div style={{
                                  margin: '8px 0',
                                  padding: '8px',
                                  backgroundColor: '#ffebee',
                                  borderRadius: '4px',
                                  borderLeft: '3px solid #f44336'
                                }}>
                                  <p style={{ margin: '0 0 4px 0', color: '#f44336', fontWeight: 'bold', fontSize: '12px' }}>
                                    🚨 {categoriesWithNO.length > 1 ? 'Categorías con incumplimiento:' : 'Categoría con incumplimiento:'}
                                  </p>
                                  <ul style={{ margin: '0', paddingLeft: '16px', color: '#d32f2f' }}>
                                    {categoriesWithNO.map((category, index) => (
                                      <li key={index} style={{ margin: '2px 0', fontSize: '12px' }}>
                                        {category}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Mensaje cuando no hay incumplimientos */}
                              {!hasIncumplimientos && (
                                <div style={{
                                  margin: '8px 0',
                                  padding: '6px',
                                  backgroundColor: '#e8f5e8',
                                  borderRadius: '4px',
                                  borderLeft: '3px solid #4caf50'
                                }}>
                                  <p style={{ margin: '0', color: '#2e7d32', fontWeight: 'bold', fontSize: '12px' }}>
                                    ✅ Sin incumplimientos detectados
                                  </p>
                                </div>
                              )}

                              {/* Comentario */}
                              {comment && comment.trim() !== '' && (
                                <div style={{
                                  margin: '8px 0 0 0',
                                  borderTop: '1px solid #eee',
                                  paddingTop: '8px'
                                }}>
                                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '12px', color: '#666' }}>
                                    💬 Comentario:
                                  </p>
                                  <p style={{
                                    margin: '0',
                                    fontSize: '11px',
                                    color: '#555',
                                    backgroundColor: '#f5f5f5',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    maxHeight: '60px',
                                    overflowY: 'auto'
                                  }}>
                                    {comment}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={96} stroke="green" strokeDasharray="3 3" label="Meta 96%" />
                    <Line
                      type="monotone"
                      dataKey="complianceRate"
                      name="Tasa de Cumplimiento"
                      stroke={theme.palette.primary.main}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90%' }}>
                  <Typography color="text.secondary">No hay datos de tendencia disponibles para el período seleccionado</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Tasa de Cumplimiento por Categoría */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 600 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Tasa de Cumplimiento por Categoría
              </Typography>
            </Box>
            {prepareCategoryData().length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  key={`category-chart-${period}-${customDateRange ? JSON.stringify(customDateRange) : 'no-custom'}-${Date.now()}`}
                  data={prepareCategoryData()}
                  layout="vertical"
                  margin={{ top: 5, right: 60, left: 150, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine
                    x={96}
                    stroke="green"
                    strokeDasharray="3 3"
                    label={{
                      value: "Meta 96%",
                      position: "right",
                      fill: "green",
                      fontSize: 12,
                      fontWeight: "bold"
                    }}
                  />
                  <Bar
                    dataKey="complianceRate"
                    name="Tasa de Cumplimiento (%)"
                    barSize={30}
                    fill="#4caf50"
                  >
                    <LabelList
                      dataKey="complianceRate"
                      position="right"
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                    {prepareCategoryData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.complianceRate >= 96 ? '#4caf50' : '#f44336'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90%' }}>
                <Typography color="text.secondary">No hay datos de categoría disponibles</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Botón para recargar datos */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={loadMondayData}
          startIcon={<span role="img" aria-label="refresh">🔄</span>}
          disabled={mondayLoading}
        >
          {mondayLoading ? 'Sincronizando...' : 'Sincronizar con Monday.com'}
        </Button>
      </Box>
    </Box>
  );
};

export default Dashboard;