import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Divider, useTheme, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Card, CardContent } from '@mui/material';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import { apiService, csvService } from '../services/serviceConfig';
import { mondayService } from '../services/mondayService';
import KPICard from './KPICard';

const MONDAY_BOARD_ID = "2205761827";

// Nombres más cortos para las categorías (para mostrar en gráficos)
const CATEGORY_SHORT_NAMES = {
  'Ventas por Tienda y Division': 'Ventas por Tienda y Division',
  'Ventas Presidencia': 'Ventas Presidencia',
  'Operativo Diario': 'Operativo Diario',
  'Indicadores Presidencia': 'Indicadores Presidencia',
  'Tendencia Firme / No Firme': 'Tendencia Firme / No Firme',
  'Ventas Viajes Palacio': 'Ventas Viajes Palacio',
  'Ventas Restaurantes': 'Ventas Restaurantes',
  'Operativo Mensual': 'Operativo Mensual',
  'Operativo Fin de Semana y Semanal': 'Operativo Fin de Semana y Semanal',
  'Operativo Anual': 'Operativo Anual'
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
      mondayCategoryMapping &&
      Object.keys(mondayCategoryMapping).length > 0 && // ← Verificar que tiene datos
      !loading &&
      !mondayLoading
    ) {
      loadData();
      setShouldLoadInitialData(false);
    }
  }, [shouldLoadInitialData, mondayCategoryMapping, loading, mondayLoading]);


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
          // ✅ EXTRAER COMENTARIOS
          const commentColumn = item.column_values.find(col =>
            col.column && (
              col.column.title.toLowerCase().includes('comentario') ||
              col.column.title.toLowerCase().includes('comment') ||
              col.id === 'commentario'
            )
          );

          const statusColumns = item.column_values.filter(col => {
            return col.text && (col.text === "OK" || col.text === "NO" || col.text === "N/A");
          });

          if (statusColumns.length > 0) {
            const categoryData = statusColumns.map(col => ({
              columnId: col.id,
              columnTitle: col.column.title,
              categoryName: mapColumnIdToCategoryName(col.id),
              status: col.text
            }));

            // ✅ CAMBIAR ESTRUCTURA PARA INCLUIR COMENTARIOS
            categoryMapping[item.name] = {
              categories: categoryData,
              comment: commentColumn ? commentColumn.text || '' : ''
            };
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

      const importResult = await mondayService.importToDashboard(MONDAY_BOARD_ID, categoryMapping);

      // 5. Actualizar timestamp de sincronización
      setLastMondaySync(new Date());

      // 6. Cargar los datos procesados
      // await loadData();

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
      return { categories: [], comment: '' }
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
    let comment = '';
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
      comment = dayData.comment || ''; // ✅ Extraer comentario

      // Extraer categorías con status "NO"
      if (dayData.categories) { // ✅ Verificar que dayData.categories existe
        dayData.categories.forEach(categoryData => {
          const { columnId, categoryName, status } = categoryData;

          // Filtrar solo las columnas KPI (tipo status) y que tengan "NO"
          if (status === 'NO' &&
            categoryName &&
            categoryName !== 'Name' &&
            categoryName !== 'Commentario' &&
            categoryName !== 'Subelementos') {

            categoriesWithNO.push(categoryName);
          }
        }); // ✅ Cerrar correctamente el forEach
      } // ✅ Cerrar correctamente el if (dayData.categories)
    } else {
      // Mostrar fechas disponibles para debugging
      const availableDates = Object.keys(mondayCategoryMapping || {}).slice(0, 10);
      console.log(`Fecha no encontrada: ${date}. Fechas disponibles:`, availableDates);
    }

    // ✅ Retornar objeto con categorías y comentario
    return { categories: categoriesWithNO, comment };
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

      // Limpiar datos filtrados antes de la nueva carga
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
            let comment = '';

            // ✅ USAR DATOS EXACTOS DE MONDAY.COM
            if (item.no > 0 && mondayCategoryMapping) {
              // Extraer categorías exactas
              const result = getExactCategoriesWithNO(item.date, mondayCategoryMapping);
              categoriesWithNO = result.categories;
              comment = result.comment;

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
            } else if (mondayCategoryMapping) {
              const result = getExactCategoriesWithNO(item.date, mondayCategoryMapping);
              comment = result.comment;
            }

            return {
              ...item,
              categoriesWithNO,
              categoryDetails,
              comment,
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

  // 1. Agrega esto al inicio de tu componente Dashboard, después de los imports:
  const scrollbarStyles = `
  .tooltip-comment-scroll {
    scrollbar-width: thin;
    scrollbar-color: #888 #f1f1f1;
  }
  
  .tooltip-comment-scroll::-webkit-scrollbar {
    width: 8px;
  }
  
  .tooltip-comment-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .tooltip-comment-scroll::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .tooltip-comment-scroll::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
  
  .tooltip-comment-container {
    background: linear-gradient(white 30%, rgba(255,255,255,0)),
                linear-gradient(rgba(255,255,255,0), white 70%) 0 100%,
                radial-gradient(50% 0, farthest-side, rgba(0,0,0,.2), rgba(0,0,0,0)),
                radial-gradient(50% 100%, farthest-side, rgba(0,0,0,.2), rgba(0,0,0,0)) 0 100%;
    background-repeat: no-repeat;
    background-color: #f0f7ff;
    background-size: 100% 15px, 100% 15px, 100% 5px, 100% 5px;
    background-attachment: local, local, scroll, scroll;
  }
`;

  // 2. Función para inyectar los estilos (agregar dentro del componente Dashboard)
  const injectScrollbarStyles = () => {
    const styleId = 'tooltip-scrollbar-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = scrollbarStyles;
      document.head.appendChild(style);
    }
  };

  // 3. Llamar la función en useEffect (agregar dentro del componente Dashboard)
  useEffect(() => {
    injectScrollbarStyles();
  }, []);

  // 4. Versión mejorada del EnhancedTooltip usando las clases CSS:
  const EnhancedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const formattedDate = data.formattedDate;
      const comment = data.comment;
      const categoriesWithNO = data.categoriesWithNO || [];
      const hasIncumplimientos = data.no > 0;

      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '16px',
          border: '2px solid #007acc',        // ✅ Borde más visible
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', // ✅ Sombra más fuerte
          fontSize: '13px',
          maxWidth: '400px',                  // ✅ Ancho controlado
          lineHeight: '1.4',

          // ✅ Z-INDEX MUY ALTO para estar por encima de todo
          zIndex: 99999,

          // ✅ POSICIONAMIENTO que evita superposición
          position: 'relative',

          // ✅ Altura máxima controlada sin scroll
          maxHeight: '500px',                 // Altura máxima para pantallas pequeñas
          overflow: 'visible',                // Sin scroll, pero controlado

          // ✅ FONDO SEMI-TRANSPARENTE PARA DESTACAR
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        }}>

          {/* Fecha */}
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '14px' }}>
            📅 {formattedDate}
          </p>

          {/* Tasa de cumplimiento */}
          <p style={{ margin: '0 0 10px 0' }}>
            <span style={{ fontWeight: 'bold' }}>📊 Tasa de Cumplimiento:</span>
            <span style={{
              color: data.complianceRate >= 90 ? '#4caf50' : data.complianceRate >= 70 ? '#ff9800' : '#f44336',
              fontWeight: 'bold',
              marginLeft: '4px'
            }}>
              {data.complianceRate ? `${data.complianceRate.toFixed(1)}%` : '0%'}
            </span>
          </p>
          {/* Categorías con incumplimientos */}
          {hasIncumplimientos && categoriesWithNO && categoriesWithNO.length > 0 && (
            <div style={{
              margin: '12px 0',
              padding: '12px',
              backgroundColor: '#ffebee',
              borderRadius: '6px',
              borderLeft: '4px solid #f44336'
            }}>
              <p style={{ margin: '0 0 8px 0', color: '#f44336', fontWeight: 'bold', fontSize: '12px' }}>
                🚨 {categoriesWithNO.length > 1 ? 'Reportes con incumplimiento:' : 'Reporte con incumplimiento:'}
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', color: '#d32f2f' }}>
                {categoriesWithNO.map((category, index) => (
                  <li key={index} style={{
                    margin: '4px 0',
                    fontSize: '11px',
                    lineHeight: '1.4'
                  }}>
                    {category}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ COMENTARIO CON ALTURA CONTROLADA */}
          {comment && comment.trim() !== '' && (
            <div style={{
              margin: '12px 0 0 0',
              borderTop: '2px solid #e0e0e0',
              paddingTop: '12px'
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#666'
              }}>
                💬 Comentario:
              </p>

              <div style={{
                backgroundColor: '#f0f7ff',
                border: '2px solid #cce7ff',
                borderRadius: '8px',
                padding: '12px',

                // ✅ ALTURA MÁXIMA CONTROLADA - SIN SCROLL PERO LIMITADA
                maxHeight: '200px',
                minHeight: 'auto',
                overflow: 'hidden',              // Oculta contenido que no cabe

                lineHeight: '1.6',
                position: 'relative'
              }}>
                <p style={{
                  margin: '0',
                  fontSize: '12px',
                  color: '#2c5282',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  {comment}
                </p>

                {/* ✅ GRADIENTE FADE-OUT SI EL COMENTARIO ES MUY LARGO */}
                {comment.length > 300 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '30px',
                    background: 'linear-gradient(transparent, #f0f7ff)',
                    pointerEvents: 'none'
                  }} />
                )}
              </div>

              {/* ✅ INDICADOR SI EL COMENTARIO ESTÁ CORTADO */}
              {comment.length > 300 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#666',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  backgroundColor: '#fff3cd',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ffeaa7'
                }}>
                  📝 Ver comentario completo en Monday.com
                </div>
              )}
            </div>
          )}

          {/* Mensaje cuando no hay comentarios */}
          {hasIncumplimientos && (!comment || comment.trim() === '') && (
            <div style={{
              margin: '12px 0 0 0',
              borderTop: '2px solid #e0e0e0',
              paddingTop: '12px'
            }}>
              <p style={{
                margin: '0',
                fontSize: '12px',
                color: '#999',
                fontStyle: 'italic',
                textAlign: 'center',
                backgroundColor: '#f9f9f9',
                padding: '8px',
                borderRadius: '4px'
              }}>
                💭 Sin comentarios adicionales para esta fecha
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
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
  // Función mejorada para preparar datos de categorías usando datos de Monday.com
  const prepareCategoryData = () => {
    if (!mondayCategoryMapping || Object.keys(mondayCategoryMapping).length === 0) {
      console.warn('No hay datos de Monday.com disponibles');
      return [];
    }

    // Filtrar categorías no deseadas
    const excludedCategories = [
      'Item ID (auto generated)',
      'Item ID (autogenerated)',
      'Item ID',
      'ID',
      'Name',
      'Commentario',
      'Subelementos'
    ];

    // Obtener rango de fechas según el período seleccionado
    const { startDate, endDate } = calculateDateRange(period);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Inicializar contadores por categoría
    const categoryStats = {};

    // ✅ CORREGIR: Cambiar 'categoryData' por 'dayData' en el parámetro
    Object.entries(mondayCategoryMapping).forEach(([dateKey, dayData]) => {
      // Convertir la fecha de Monday.com al formato Date para comparar
      let itemDate;

      // Monday.com usa formato DD-MM-YYYY (ej: "01-05-2025")
      if (dateKey.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const [day, month, year] = dateKey.split('-');
        itemDate = new Date(year, month - 1, day);
      }
      // También manejar formato DD/MM/YYYY
      else if (dateKey.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [day, month, year] = dateKey.split('/');
        itemDate = new Date(year, month - 1, day);
      }
      else {
        // Intentar parsear directamente
        itemDate = new Date(dateKey);
      }

      // Verificar que la fecha es válida y está en el rango
      if (isNaN(itemDate.getTime())) {
        console.warn(`Fecha inválida en Monday.com: ${dateKey}`);
        return;
      }

      // Normalizar fechas para comparación
      const normalizedItemDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      const normalizedStartDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
      const normalizedEndDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());

      // Verificar si la fecha está en el rango seleccionado
      if (normalizedItemDate >= normalizedStartDate && normalizedItemDate <= normalizedEndDate) {

        // ✅ AHORA SÍ PUEDE USAR dayData porque está definido correctamente
        if (dayData.categories && Array.isArray(dayData.categories)) {
          dayData.categories.forEach(categoryItem => {
            const { categoryName, status } = categoryItem;

            // Filtrar categorías excluidas
            if (!categoryName || excludedCategories.includes(categoryName)) {
              return;
            }

            // Inicializar categoría si no existe
            if (!categoryStats[categoryName]) {
              categoryStats[categoryName] = {
                ok: 0,
                no: 0,
                na: 0,
                totalDays: 0
              };
            }

            // Contar este día para la categoría
            categoryStats[categoryName].totalDays++;

            // Contar según el estado
            switch (status) {
              case 'OK':
                categoryStats[categoryName].ok++;
                break;
              case 'NO':
                categoryStats[categoryName].no++;
                break;
              case 'N/A':
                categoryStats[categoryName].na++;
                break;
              default:
                console.warn(`Estado desconocido: ${status} para categoría ${categoryName}`);
            }
          });
        } else {
          console.warn(`Estructura de datos incorrecta para fecha ${dateKey}:`, dayData);
        }
      }
    });

    // Convertir a formato para gráfico
    const data = Object.entries(categoryStats)
      .map(([category, stats]) => {
        // Calcular tasa de cumplimiento basada solo en OK y NO (ignorar NA)
        const total = stats.ok + stats.no;
        const complianceRate = total > 0 ? (stats.ok / total) * 100 : 0;

        return {
          name: CATEGORY_SHORT_NAMES[category] || category,
          fullName: category,
          ok: stats.ok,
          no: stats.no,
          na: stats.na,
          totalDays: stats.totalDays,
          complianceRate: complianceRate,
          // Información adicional para debugging
          validResponses: total, // Solo OK + NO
          responseRate: stats.totalDays > 0 ? ((total + stats.na) / stats.totalDays) * 100 : 0
        };
      })
      // Filtrar categorías sin datos válidos
      .filter(item => item.validResponses > 0)
      // Ordenar por tasa de cumplimiento (menor a mayor para mostrar problemas primero)
      .sort((a, b) => a.complianceRate - b.complianceRate);

    return data;
  };

  // CustomTooltip mejorado para mostrar información detallada de categorías
  const CustomTooltipCategory = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          fontSize: '13px',
          maxWidth: '300px',
          lineHeight: '1.4'
        }}>
          {/* Nombre de la categoría */}
          <p style={{
            margin: '0 0 8px 0',
            fontWeight: 'bold',
            fontSize: '14px',
            borderBottom: '1px solid #eee',
            paddingBottom: '4px'
          }}>
            📂 {data.fullName || data.name}
          </p>

          {/* Tasa de cumplimiento */}
          <p style={{ margin: '0 0 6px 0' }}>
            <span style={{ fontWeight: 'bold' }}>📊 Tasa de Cumplimiento: </span>
            <span style={{
              color: data.complianceRate >= 96 ? '#4caf50' :
                data.complianceRate >= 80 ? '#ff9800' : '#f44336',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {data.complianceRate.toFixed(1)}%
            </span>
          </p>

          {/* Estadísticas detalladas */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '8px',
            borderRadius: '4px',
            margin: '6px 0'
          }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
              📈 Estadísticas del período:
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span style={{ color: '#4caf50', fontSize: '12px' }}>✅ Cumplimientos:</span>
              <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{data.ok}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span style={{ color: '#f44336', fontSize: '12px' }}>❌ Incumplimientos:</span>
              <span style={{ fontWeight: 'bold', color: '#f44336' }}>{data.no}</span>
            </div>

            {data.na > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span style={{ color: '#9e9e9e', fontSize: '12px' }}>➖ No Aplica:</span>
                <span style={{ fontWeight: 'bold', color: '#9e9e9e' }}>{data.na}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Función auxiliar para obtener estadísticas detalladas por categoría (opcional)
  const getCategoryDetailedStats = () => {
    if (!mondayCategoryMapping) return {};

    const { startDate, endDate } = calculateDateRange(period);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const stats = {
      totalDatesProcessed: 0,
      totalCategoriesFound: new Set(),
      dateRange: `${startDate} a ${endDate}`,
      categoryBreakdown: {}
    };

    Object.entries(mondayCategoryMapping).forEach(([dateKey, categoryData]) => {
      let itemDate;
      if (dateKey.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const [day, month, year] = dateKey.split('-');
        itemDate = new Date(year, month - 1, day);
      } else {
        itemDate = new Date(dateKey);
      }

      if (!isNaN(itemDate.getTime())) {
        const normalizedItemDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        const normalizedStartDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
        const normalizedEndDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());

        if (normalizedItemDate >= normalizedStartDate && normalizedItemDate <= normalizedEndDate) {
          stats.totalDatesProcessed++;

          categoryData.forEach(({ categoryName, status }) => {
            if (categoryName && !['Name', 'Commentario', 'Subelementos'].includes(categoryName)) {
              stats.totalCategoriesFound.add(categoryName);

              if (!stats.categoryBreakdown[categoryName]) {
                stats.categoryBreakdown[categoryName] = { OK: 0, NO: 0, 'N/A': 0 };
              }
              stats.categoryBreakdown[categoryName][status] = (stats.categoryBreakdown[categoryName][status] || 0) + 1;
            }
          });
        }
      }
    });

    stats.totalCategoriesFound = stats.totalCategoriesFound.size;
    return stats;
  };

  const prepareTrendData = () => {
    // ✅ USAR los datos ya enriquecidos de summary.filteredTrend
    if (summary && summary.filteredTrend && Array.isArray(summary.filteredTrend) && summary.filteredTrend.length > 0) {

      // 🆕 AGREGAR ESTAS LÍNEAS PARA ORDENAMIENTO
      const sortedTrend = [...summary.filteredTrend].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB; // Orden ascendente: más antigua → más reciente
      });

      // 🔄 CAMBIAR summary.filteredTrend por sortedTrend en el map
      return sortedTrend.map(item => ({
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
                <ResponsiveContainer width="100%" height="90%" style={{ zIndex: 1, position: 'relative' }}>
                  <LineChart
                    key={`chart-${period}-${customDateRange ? JSON.stringify(customDateRange) : 'no-custom'}-${Date.now()}`}
                    data={prepareTrendData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                    style={{
                      overflow: 'visible'         // ✅ Permitir que el tooltip se salga
                    }}
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
                    <Tooltip content={<EnhancedTooltip />}/>
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

        {/* Tasa de Cumplimiento por Reporte */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 600 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Tasa de Cumplimiento por Reporte
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
                  <Tooltip content={<CustomTooltipCategory />} />
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
    </Box>
  );
};

export default Dashboard;