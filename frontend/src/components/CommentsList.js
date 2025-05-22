import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  TextField,
  Button,
  CircularProgress,
  Paper
} from '@mui/material';
import { apiService } from '../services/serviceConfig';
import { formatDate } from '../utils/formatters';

const CommentsList = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getComments(null, null, 10);
      setComments(response.comments || []);
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      await apiService.addComment(selectedDate, newComment);
      
      // Limpiar el formulario
      setNewComment('');
      
      // Recargar comentarios
      await loadComments();
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Formulario para agregar comentario */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Agregar comentario
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            type="date"
            label="Fecha"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            margin="normal"
            size="small"
          />
          <TextField
            label="Comentario"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={2}
            placeholder="Escribe un comentario..."
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!newComment.trim() || submitting}
              size="small"
            >
              {submitting ? <CircularProgress size={24} /> : 'Agregar'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Lista de comentarios */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : comments.length === 0 ? (
        <Typography color="text.secondary" align="center">
          No hay comentarios
        </Typography>
      ) : (
        <List>
          {comments.map((comment, index) => (
            <React.Fragment key={comment.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2">
                        {comment.userName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(comment.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ mt: 1, mb: 1 }}
                      >
                        {comment.comment}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fecha: {comment.date}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default CommentsList;