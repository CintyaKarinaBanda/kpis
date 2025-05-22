import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  useTheme,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  LabelList
} from 'recharts';
import { apiService, csvService } from '../services/serviceConfig';
import KPICard from './KPICard';

// Colores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Nombres más cortos para las categorías (para mostrar en gráficos)
const CATEGORY_SHORT_NAMES = {
  'Ventas por Tienda y Division': 'Ventas Tienda',
  'Ventas Presidencia': 'Ventas Pres.',
  'Operativo Diario': 'Op. Diario',
  'Indicadores Presidencia': 'Ind. Pres.',
  'Tendencia Firme / No Firme Ecommerce Outlet': 'Tendencias',
  'Ventas Viajes Palacio': 'Viajes',
  'Ventas Restaurantes': 'Restaurantes',
  'Operativo Mensual': 'Op. Mensual',
  'Operativo Fin de Semana y Semanal': 'Op. Semanal',
  'Operativo Anual': 'Op. Anual'
};

// Función para formatear fechas ISO a formato DD/MM/YYYY
const formatDate = (isoDate) => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  } catch (e) {
    console.error('Error al formatear fecha:', e);
    return isoDate;
  }
};

const Dashboard = ({ userConfig }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState('month');
  const [error, setError] = useState(null);
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

  // Cargar datos según el período seleccionado
  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Calcular fechas según el período
      const { startDate, endDate } = calculateDateRange(period);
      
      console.log(`Cargando datos de KPI desde ${startDate} hasta ${endDate}`);
      
      // Obtener datos de KPI
      const response = await csvService.getKPISummary(startDate, endDate);
      console.log('Datos de KPI recibidos:', response);
      
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
              console.log(`Fecha más reciente en los datos: ${maxDate}`);
            }
          } catch (error) {
            console.error('Error al determinar la fecha más reciente:', error);
            // Usar la fecha actual como fallback
            maxDate = endDate;
          }
        }
        
        // Generar fechas para el período seleccionado
        const dateRange = [];
        const currentDate = new Date(maxDate);
        const startDateObj = new Date(startDate);
        
        // Generar todas las fechas en el rango
        while (currentDate >= startDateObj) {
          dateRange.unshift(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() - 1);
        }
        
        console.log(`Fechas generadas para el período: ${dateRange.length}`);
        
        // Crear un objeto con todas las fechas del período
        const completeData = {};
        dateRange.forEach(date => {
          // Buscar si hay datos para esta fecha
          const existingData = processedSummary.trend.find(item => item.date === date);
          
          if (existingData) {
            completeData[date] = existingData;
          } else {
            // Si no hay datos, crear un registro vacío
            completeData[date] = {
              date,
              complianceRate: null,
              ok: 0,
              no: 0,
              na: 0
            };
          }
        });
        
        // Convertir a array y ordenar por fecha
        const filteredTrend = Object.values(completeData).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        
        console.log(`Tendencia completa generada: ${filteredTrend.length} días`);
        
        // Calcular totales para el período
        if (filteredTrend.length > 0) {
          // Sumar todos los OK y NO de cada día en el período
          let totalOk = 0;
          let totalNo = 0;
          let totalNa = 0;
          
          filteredTrend.forEach(item => {
            totalOk += (item.ok || 0);
            totalNo += (item.no || 0);
            totalNa += (item.na || 0);
          });
          
          const totalRecords = filteredTrend.filter(item => 
            item.ok > 0 || item.no > 0 || item.na > 0
          ).length;
          
          // Calcular tasa de cumplimiento
          const complianceRate = totalOk + totalNo > 0 ? 
            (totalOk / (totalOk + totalNo) * 100).toFixed(2) : "0.00";
          
          console.log(`Datos filtrados: OK=${totalOk}, NO=${totalNo}, N/A=${totalNa}, Total=${totalRecords}, Compliance=${complianceRate}%`);
          
          // Actualizar el resumen con los datos filtrados
          processedSummary.filteredTrend = filteredTrend;
          processedSummary.filteredOkCount = totalOk;
          processedSummary.filteredNoCount = totalNo;
          processedSummary.filteredNaCount = totalNa;
          processedSummary.filteredTotalRecords = totalRecords;
          processedSummary.filteredComplianceRate = complianceRate;
        } else {
          // Si no hay datos en el período, establecer valores en cero
          processedSummary.filteredTrend = [];
          processedSummary.filteredOkCount = 0;
          processedSummary.filteredNoCount = 0;
          processedSummary.filteredNaCount = 0;
          processedSummary.filteredTotalRecords = 0;
          processedSummary.filteredComplianceRate = "0.00";
        }
        
        setSummary(processedSummary);
      } else {
        console.error('Respuesta de API incompleta:', response);
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
    // Si hay un rango de fechas personalizado, usarlo
    if (period === 'custom' && customDateRange) {
      return customDateRange;
    }
    
    // Usar la fecha actual como final del rango
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 6); // 7 días incluyendo hoy
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
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
  
  const handleApplyCustomDates = () => {
    // Validar fechas
    if (!customStartDate || !customEndDate) {
      alert('Por favor, seleccione ambas fechas');
      return;
    }
    
    // Verificar que la fecha de inicio sea anterior a la fecha de fin
    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    
    // Guardar el rango personalizado
    setCustomDateRange({
      startDate: customStartDate,
      endDate: customEndDate
    });
    
    // Cambiar a modo personalizado
    setPeriod('custom');
    
    // Cerrar el diálogo
    setDateDialogOpen(false);
  };

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  // Preparar datos para gráficos según el período seleccionado
  const prepareCategoryData = () => {
    if (!summary || !summary.byCategory) {
      console.log('No hay datos de categoría disponibles');
      return [];
    }
    
    // Filtrar categorías no deseadas
    const excludedCategories = ['Item ID (auto generated)', 'Item ID (autogenerated)', 'Item ID', 'ID'];
    
    // Obtener datos filtrados por período
    const { startDate, endDate } = calculateDateRange(period);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Filtrar datos por período
    // Primero, obtener todas las fechas en el rango seleccionado
    const datesInRange = Object.keys(summary.byDate || {}).filter(date => {
      const dateObj = new Date(date);
      return dateObj >= startDateObj && dateObj <= endDateObj;
    });
    
    // Inicializar contadores por categoría para el período seleccionado
    const categoryData = {};
    
    // Para cada categoría, inicializar contadores
    Object.keys(summary.byCategory || {}).forEach(category => {
      if (!excludedCategories.includes(category)) {
        categoryData[category] = { ok: 0, no: 0, na: 0 };
      }
    });
    
    // Para cada fecha en el rango, procesar los datos
    if (summary.trend && summary.trend.length > 0) {
      summary.trend.forEach(dayData => {
        const dateObj = new Date(dayData.date);
        // Solo procesar si la fecha está en el rango
        if (dateObj >= startDateObj && dateObj <= endDateObj) {
          // Aquí necesitaríamos los datos por categoría para cada día
          // Como no tenemos esa información detallada, usamos una aproximación
          // En una implementación real, se necesitaría tener datos más detallados
        }
      });
    }
    
    // Si no pudimos filtrar por fecha (datos insuficientes), usar los datos totales
    // pero aplicar un factor de escala basado en el número de días en el período
    const totalDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
    const allDays = Object.keys(summary.byDate || {}).length || 30; // Fallback a 30 días
    const scaleFactor = totalDays / allDays;
    
    const data = Object.entries(summary.byCategory)
      .filter(([category]) => !excludedCategories.includes(category))
      .map(([category, data]) => {
        // Si estamos en modo personalizado o no es el período completo, aplicar escala
        let ok = data.ok;
        let no = data.no;
        let na = data.na;
        
        // Aplicar escala solo si no es el período completo
        if (period !== 'year' && scaleFactor < 0.9) {
          ok = Math.round(data.ok * scaleFactor);
          no = Math.round(data.no * scaleFactor);
          na = Math.round(data.na * scaleFactor);
        }
        
        // Calcular tasa de cumplimiento con los datos escalados
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

  const preparePieData = () => {
    if (!summary) {
      console.log('No hay datos de resumen disponibles para el gráfico circular');
      return [];
    }
    
    // Si tenemos datos filtrados precalculados, usarlos
    if (summary.filteredTrend !== undefined) {
      console.log('Usando datos filtrados precalculados');
      console.log(`OK: ${summary.filteredOkCount}, NO: ${summary.filteredNoCount}, Tasa: ${summary.filteredComplianceRate}%`);
      
      const complianceRate = parseFloat(summary.filteredComplianceRate);
      const data = [
        { name: '', value: complianceRate },
        { name: '', value: 100 - complianceRate }
      ];
      
      return data;
    }
    
    // Fallback a los datos totales
    const complianceRate = parseFloat(summary.complianceRate);
    const data = [
      { name: '', value: complianceRate },
      { name: '', value: 100 - complianceRate }
    ];
    
    return data;
  };

  // Preparar datos para la tendencia diaria
  const prepareTrendData = () => {
    if (!summary) {
      console.log('No hay datos de tendencia disponibles');
      return [];
    }
    
    // Si tenemos datos filtrados precalculados, usarlos
    if (summary.filteredTrend && summary.filteredTrend.length > 0) {
      console.log('Usando tendencia filtrada precalculada:', summary.filteredTrend.length);
      console.log('Comentarios disponibles:', summary.uniqueErrors);
      
      // Formatear fechas para mostrar en el gráfico
      const formattedData = summary.filteredTrend.map(item => {
        // Buscar comentario para esta fecha
        let comment = null;
        if (summary.uniqueErrors) {
          const formattedDate = formatDate(item.date);
          console.log(`Buscando comentario para fecha: ${formattedDate}`);
          
          const dateComment = summary.uniqueErrors.find(err => {
            if (err.startsWith('[') && err.includes(']')) {
              const datePart = err.split(']')[0].substring(1);
              const match = datePart === formattedDate;
              if (match) {
                console.log(`Encontrado comentario para ${formattedDate}: ${err}`);
              }
              return match;
            }
            return false;
          });
          
          if (dateComment) {
            comment = dateComment.split(']')[1].trim();
            console.log(`Comentario extraído: ${comment}`);
          }
        }
        
        return {
          ...item,
          formattedDate: formatDate(item.date),
          // Asegurar que complianceRate sea un número válido para el gráfico
          complianceRate: item.complianceRate !== null ? item.complianceRate : null,
          comment: comment
        };
      });
      
      console.log('Datos formateados con comentarios:', formattedData);
      return formattedData;
    }
    
    // Si no hay datos filtrados, usar los datos originales
    if (!summary.trend || !Array.isArray(summary.trend) || summary.trend.length === 0) {
      return [];
    }
    
    // Obtener el rango de fechas actual
    const { startDate, endDate } = calculateDateRange(period);
    
    // Generar fechas para el período seleccionado
    const dateRange = [];
    const currentDate = new Date(endDate);
    const startDateObj = new Date(startDate);
    
    // Generar todas las fechas en el rango
    while (currentDate >= startDateObj) {
      dateRange.unshift(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Crear un objeto con todas las fechas del período
    const completeData = [];
    dateRange.forEach(date => {
      // Buscar si hay datos para esta fecha
      const existingData = summary.trend.find(item => item.date === date);
      
      if (existingData) {
        completeData.push({
          ...existingData,
          formattedDate: formatDate(date)
        });
      } else {
        // Si no hay datos, crear un registro vacío
        completeData.push({
          date,
          formattedDate: formatDate(date),
          complianceRate: null,
          ok: 0,
          no: 0,
          na: 0
        });
      }
    });
    
    return completeData;
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadData}>
          Reintentar
        </Button>
      </Box>
    );
  }

  // Si no hay datos, mostrar mensaje
  if (!summary || summary.totalRecords === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          No hay datos disponibles para mostrar. Por favor, cargue archivos CSV con datos de KPI.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
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
                  title="Total Registros"
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
              {prepareTrendData().length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart
                    data={prepareTrendData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="formattedDate" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                      interval={period === 'week' ? 0 : period === 'month' ? 6 : period === 'quarter' ? 14 : 30}  // Ajustar intervalo según período
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      ticks={[0, 20, 40, 60, 80, 96, 100]}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          // Obtener datos del punto
                          const data = payload[0].payload;
                          const formattedDate = data.formattedDate;
                          
                          // Usar el comentario ya incluido en los datos
                          const comment = data.comment;
                          // console.log(`Tooltip para fecha ${formattedDate}, comentario: ${comment}`);
                          
                          return (
                            <div style={{ 
                              backgroundColor: '#fff', 
                              padding: '10px', 
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              fontSize: '12px',
                              maxWidth: '300px'
                            }}>
                              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Fecha: {formattedDate}</p>
                              <p style={{ margin: '0 0 5px 0' }}>
                                <span style={{ fontWeight: 'bold' }}>Tasa de Cumplimiento:</span> {data.complianceRate ? `${data.complianceRate.toFixed(2)}%` : 'N/A'}
                              </p>
                              {comment && (
                                <p style={{ margin: '0', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                                  <span style={{ fontWeight: 'bold' }}>Comentario:</span> {comment}
                                </p>
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
          onClick={loadData}
          startIcon={<span role="img" aria-label="refresh">🔄</span>}
        >
          Actualizar datos
        </Button>
      </Box>
    </Box>
  );
};

export default Dashboard;