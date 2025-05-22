import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import axios from 'axios';

/**
 * Componente para depurar la conexión con Monday.com
 */
const MondayDebug = () => {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [boardId, setBoardId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Función para probar la conexión directamente con Monday.com
  const testMondayConnection = async () => {
    if (!apiKey || !boardId) {
      setError('Por favor, ingresa tanto la API key como el ID del tablero');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Crear cliente de axios con la API key proporcionada
      const mondayClient = axios.create({
        baseURL: 'https://api.monday.com/v2',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Consulta GraphQL para obtener información básica del tablero
      const query = `
        query {
          boards(ids: ${boardId}) {
            name
            state
            board_kind
            columns {
              id
              title
              type
            }
          }
        }
      `;

      // Realizar la petición
      const response = await mondayClient.post('', { query });

      // Mostrar resultado
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
    } catch (error) {
      console.error('Error al probar conexión con Monday.com:', error);
      
      setError(
        error.response 
          ? `Error ${error.response.status}: ${JSON.stringify(error.response.data)}` 
          : `Error: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Depuración de Monday.com
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Esta herramienta te permite probar directamente la conexión con Monday.com para verificar si tu API key y el ID del tablero son correctos.
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="API Key de Monday.com"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          fullWidth
          type="password"
          placeholder="Ingresa tu API key"
        />
        
        <TextField
          label="ID del Tablero"
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          fullWidth
          placeholder="Ej: 2205761827"
        />
        
        <Button
          variant="contained"
          onClick={testMondayConnection}
          disabled={loading || !apiKey || !boardId}
        >
          {loading ? <CircularProgress size={24} /> : 'Probar Conexión'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {result && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Resultado de la prueba:
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }}>
            Conexión exitosa: Estado {result.status} {result.statusText}
          </Alert>
          
          {result.data?.data?.boards?.[0] ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Información del tablero:
              </Typography>
              <Typography variant="body2">
                <strong>Nombre:</strong> {result.data.data.boards[0].name}
              </Typography>
              <Typography variant="body2">
                <strong>Estado:</strong> {result.data.data.boards[0].state}
              </Typography>
              <Typography variant="body2">
                <strong>Tipo:</strong> {result.data.data.boards[0].board_kind}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Columnas ({result.data.data.boards[0].columns.length}):</strong>
              </Typography>
              <Box component="pre" sx={{ 
                mt: 1, 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 200
              }}>
                {JSON.stringify(result.data.data.boards[0].columns, null, 2)}
              </Box>
            </Box>
          ) : (
            <Alert severity="warning">
              No se encontró información del tablero en la respuesta
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default MondayDebug;