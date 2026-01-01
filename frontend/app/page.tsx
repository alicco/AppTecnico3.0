'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getPrinters, searchErrors, type ErrorCode } from '@/app/actions/search';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { AutocompleteSearch } from '@/components/ui/AutocompleteSearch';
import { DipSwitchViewer } from '@/components/ui/DipSwitchViewer';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { Print as PrintIcon, Search as SearchIcon, Settings as SettingsIcon, Tune as TuneIcon } from '@mui/icons-material';

export default function Home() {
  const [printers, setPrinters] = useState<{ id: string, model_name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [codeQuery, setCodeQuery] = useState('');
  const [results, setResults] = useState<ErrorCode[]>([]);
  const [isPending, startTransition] = useTransition();

  // Dip Switch State
  const [dipSwitchTarget, setDipSwitchTarget] = useState<{ switch: number, bit: number } | null>(null);
  const [showDipSwitches, setShowDipSwitches] = useState(false);
  const dipSwitchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPrinters().then(setPrinters);
  }, []);

  const handleSearch = (overrideCode?: string) => {
    if (!selectedModel) return;
    const query = overrideCode !== undefined ? overrideCode : codeQuery;

    if (!query.trim()) {
      setResults([]);
      return;
    }

    startTransition(async () => {
      // Pass 'true' for exact matching on the main search action
      const data = await searchErrors(selectedModel, query, true);
      setResults(data);
    });
  };

  const onDipSwitchClick = (sw: number, bit: number) => {
    setDipSwitchTarget({ switch: sw, bit });
    setShowDipSwitches(true);
    // Brief timeout to allow render
    setTimeout(() => {
      dipSwitchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      <Container maxWidth="md" sx={{ pt: 8 }}>
        <Stack spacing={6}>

          {/* Header */}
          <Box textAlign="center">
            <Typography
              variant="h2"
              fontWeight="800"
              sx={{
                background: 'linear-gradient(45deg, #005CAF 30%, #4facfe 90%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                mb: 1
              }}
            >
              KM Insight
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
              Advanced Service Intelligence & Diagnostics for Konica Minolta
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ mb: 2, fontSize: '0.8rem', opacity: 0.8 }}>
              ⚠️ Versione BETA. Non sostituisce il manuale tecnico ufficiale.
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 1 }}>
              SVILUPPATO DA <a href="https://aisac.shop" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>AISAC</a>
            </Typography>
          </Box>

          {/* Search Section */}
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Grid container spacing={3} alignItems="center">
              {/* Model Selector */}
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Select Model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PrintIcon color="action" />
                        </InputAdornment>
                      ),
                    }
                  }}
                >
                  {printers.map((p) => (
                    <MenuItem key={p.id} value={p.model_name}>
                      {p.model_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Search Input */}
              <Grid size={{ xs: 12, md: 6 }}>
                <AutocompleteSearch
                  model={selectedModel}
                  onSelect={(code) => {
                    setCodeQuery(code);
                    handleSearch(code);
                  }}
                  onQueryChange={setCodeQuery}
                  placeholder="Enter Error Code..."
                />
              </Grid>

              {/* Search Button */}
              <Grid size={{ xs: 12, md: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => handleSearch()}
                  disabled={isPending || !selectedModel}
                  sx={{ height: 56, borderRadius: 2 }}
                  startIcon={!isPending && <SearchIcon />}
                >
                  {isPending ? <CircularProgress size={24} color="inherit" /> : 'Search'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Dip Switch Toggle */}
          {selectedModel && (
            <Box display="flex" justifyContent="center">
              <Button
                startIcon={<TuneIcon />}
                onClick={() => setShowDipSwitches(true)}
                variant="contained"
                size="large"
                sx={{
                  background: 'linear-gradient(45deg, #005CAF 30%, #4facfe 90%)',
                  borderRadius: 50,
                  px: 4,
                  py: 1.5,
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  color: 'white',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1rem',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    background: 'linear-gradient(45deg, #004b8f 30%, #3a8fd5 90%)',
                  }
                }}
              >
                {showDipSwitches ? 'DipSW Matrix Active' : 'Open DipSW Matrix'}
              </Button>
            </Box>
          )}

          {/* Dip Switch Viewer Modal/Section */}
          {showDipSwitches && selectedModel && (
            <DipSwitchViewer
              model={selectedModel}
              target={dipSwitchTarget}
              onClose={() => {
                setShowDipSwitches(false);
                setDipSwitchTarget(null);
              }}
            />
          )}

          {/* Results */}
          <Stack spacing={3}>
            {results.length > 0 ? (
              results.map((err) => (
                <ErrorCard
                  key={err.id}
                  error={err}
                  onDipSwitchClick={onDipSwitchClick}
                />
              ))
            ) : (
              !isPending && codeQuery && (
                <Box textAlign="center" py={8}>
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    No exact match found
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Try selecting a suggestion from the list
                  </Typography>
                </Box>
              )
            )}
          </Stack>

        </Stack>
      </Container>
    </Box>
  );
}
