'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getPrinters, searchErrors, type ErrorCode } from '@/app/actions/search';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { AutocompleteSearch } from '@/components/ui/AutocompleteSearch';
import { DipSwitchViewer } from '@/components/ui/DipSwitchViewer';
import { PartSearchAutocomplete, Part } from '@/components/ui/PartSearchAutocomplete';
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
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Drawer,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse
} from '@mui/material';
import {
  Print as PrintIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  BugReport as BugIcon,
  Error as ErrorIcon,
  Build as BuildIcon,
  ArrowBack as ArrowBackIcon,
  Build as PartIcon,
  ShoppingCart as CartIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { Toaster, toast } from 'react-hot-toast';

interface CartItem extends Part {
  cartId: string;
}

interface MaintenanceSection {
  name: string;
  items: {
    code: string;
    name: string;
    qty: string;
    life: string;
    page_key: string;
  }[];
}

export default function Home() {
  // Tabs State: 0 = Errors, 1 = Parts, 2 = Maintenance
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSection, setExpandedSection] = useState<'errors' | 'parts' | null>(null);

  // Common State
  const [printers, setPrinters] = useState<{ id: string, model_name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Maintenance Data
  const [maintenanceData, setMaintenanceData] = useState<Record<string, MaintenanceSection[]>>({});
  const [selectedMaintenanceModel, setSelectedMaintenanceModel] = useState('C4065');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // --- ERROR SEARCH STATE ---
  const [codeQuery, setCodeQuery] = useState('');
  const [errorResults, setErrorResults] = useState<ErrorCode[]>([]);
  const [isPending, startTransition] = useTransition();
  const [dipSwitchTarget, setDipSwitchTarget] = useState<{ switch: number, bit: number } | null>(null);
  const [showDipSwitches, setShowDipSwitches] = useState(false);
  const dipSwitchRef = useRef<HTMLDivElement>(null);

  // --- PARTS SEARCH STATE ---
  const [partSection, setPartSection] = useState('');
  const [partSectionsList, setPartSectionsList] = useState<string[]>([]);
  const [partResults, setPartResults] = useState<Part[]>([]);
  const [partLoading, setPartLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [partSearchMode, setPartSearchMode] = useState<'smart' | 'section'>('smart'); // 'smart' or 'section'


  useEffect(() => {
    getPrinters().then(data => {
      // Ensure unique model names for dropdown
      const uniqueModels = Array.from(new Set(data.map(p => p.model_name)))
        .map(name => data.find(p => p.model_name === name)!);
      setPrinters(uniqueModels);
    });

    // Load Cart
    const savedCart = localStorage.getItem('parts_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  // Load maintenance data on mount
  useEffect(() => {
    fetch('/data/maintenance_all.json')
      .then(res => res.json())
      .then(data => setMaintenanceData(data))
      .catch(err => console.error('Failed to load maintenance data:', err));
  }, []);

  useEffect(() => {
    localStorage.setItem('parts_cart', JSON.stringify(cart));
  }, [cart]);

  // Fetch sections when model changes (for Parts tab - Browse Sections mode)
  useEffect(() => {
    if (selectedModel && expandedSection === 'parts' && partSearchMode === 'section') {
      fetch(`${API_BASE}/api/parts/sections?model=${selectedModel}`)
        .then(res => res.json())
        .then(data => setPartSectionsList(data))
        .catch(err => console.error(err));
      setPartSection('');
    }
  }, [selectedModel, expandedSection, partSearchMode, API_BASE]);

  // AUTO-SEARCH ON SECTION CHANGE
  useEffect(() => {
    if (expandedSection === 'parts' && partSearchMode === 'section' && selectedModel && partSection) {
      searchParts();
    }
  }, [partSection, partSearchMode, selectedModel, expandedSection]);


  // --- ERROR HANDLERS ---
  const handleErrorSearch = (overrideCode?: string) => {
    if (!selectedModel) return;
    const query = overrideCode !== undefined ? overrideCode : codeQuery;

    if (!query.trim()) {
      setErrorResults([]);
      return;
    }

    startTransition(async () => {
      const data = await searchErrors(selectedModel, query, true);
      setErrorResults(data);
    });
  };

  const onDipSwitchClick = (sw: number, bit: number) => {
    setDipSwitchTarget({ switch: sw, bit });
    setShowDipSwitches(true);
    setTimeout(() => {
      dipSwitchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // --- PARTS HANDLERS ---
  const searchParts = async () => {
    setPartLoading(true);
    let url = `${API_BASE}/api/parts?limit=500&fuzzy=true`;

    if (!selectedModel) {
      // If auto-triggered by effect, we might not want to toast error if model is missing (though effect handles it)
      // But for manual button click, validation is good.
      if (!partSection) { // Only toast if explicitly called without section?
        // pass
      }
      setPartLoading(false);
      return;
    }
    url += `&model=${selectedModel}`;

    if (partSearchMode === 'section') {
      if (partSection) url += `&section=${encodeURIComponent(partSection)}`;
    }
    // Note: Smart search is handled by Autocomplete component, but if we need manual trigger:
    // ...

    try {
      const res = await fetch(url);
      const data = await res.json();
      setPartResults(data);
    } catch (err) {
      toast.error('Search failed');
      console.error(err);
    } finally {
      setPartLoading(false);
    }
  };

  const addToCart = (part: Part) => {
    const newItem: CartItem = { ...part, cartId: Math.random().toString(36).substr(2, 9) };
    setCart([...cart, newItem]);
    toast.success('Added to favorites');
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const copyCart = () => {
    const text = cart.map(item => `${item.part_code} - ${item.name} | Qty: ${item.quantity || '1'} | ${item.model}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Cart copied to clipboard');
  };

  const printCart = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const html = `
              <html>
              <head>
                  <title>Spare Parts List</title>
                  <style>
                      body { font-family: Arial, sans-serif; padding: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f2f2f2; }
                      h1 { color: #333; }
                  </style>
              </head>
              <body>
                  <h1>Selected Favorites</h1>
                  <table>
                      <thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Model</th><th>Section</th></tr></thead>
                      <tbody>
                          ${cart.map(item => `
                              <tr>
                                  <td>${item.part_code}</td><td>${item.name}</td><td>${item.quantity || '1'}</td><td>${item.model}</td><td>${item.section_name}</td>
                              </tr>`).join('')}
                      </tbody>
                  </table>
              </body>
              </html>
          `;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      <Toaster position="top-right" />
      <Container maxWidth="lg" sx={{ pt: 4 }}>
        <Stack spacing={4}>

          {/* HOMEPAGE: Only when nothing expanded */}
          {!expandedSection && (
            <>
              {/* Header */}
              <Box textAlign="center" mb={6}>
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
                <Typography variant="body2" color="warning.main" sx={{ mb: 4, fontSize: '0.8rem', opacity: 0.8 }}>
                  ⚠️ Versione BETA. Non sostituisce il manuale tecnico ufficiale.
                </Typography>
              </Box>

              {/* Two Big Buttons Side by Side */}
              <Grid container spacing={3} justifyContent="center">
                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={() => setExpandedSection('errors')}
                    sx={{
                      py: 6,
                      borderRadius: 4,
                      borderWidth: 3,
                      borderColor: '#1976d2',
                      color: '#1976d2',
                      '&:hover': {
                        borderWidth: 3,
                        borderColor: '#1976d2',
                        bgcolor: 'rgba(25, 118, 210, 0.08)'
                      }
                    }}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <BugIcon sx={{ fontSize: 64 }} />
                      <Typography variant="h4" fontWeight="bold">
                        Codici Errore
                      </Typography>
                    </Box>
                  </Button>


                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={() => setExpandedSection('parts')}
                    sx={{
                      py: 6,
                      borderRadius: 4,
                      borderWidth: 3,
                      borderColor: '#d32f2f',
                      color: '#d32f2f',
                      '&:hover': {
                        borderWidth: 3,
                        borderColor: '#d32f2f',
                        bgcolor: 'rgba(211, 47, 47, 0.08)'
                      }
                    }}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <BuildIcon sx={{ fontSize: 64 }} />
                      <Typography variant="h4" fontWeight="bold">
                        Ricerca Parti
                      </Typography>
                    </Box>
                  </Button>

                </Grid>
              </Grid>
            </>
          )}

          {/* ERROR CODES SECTION: Full Screen */}
          {expandedSection === 'errors' && (
            <Box>
              <Button
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setExpandedSection(null);
                  setSelectedModel('');
                  setErrorResults([]);
                }}
                sx={{ mb: 3, borderRadius: 2, px: 3, bgcolor: '#1976d2' }}
              >
                Torna alla Home
              </Button>

              <Paper elevation={3} sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Seleziona Modello"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setErrorResults([]);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PrintIcon color="action" />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 3 }
                    }
                  }}
                >
                  <MenuItem value=""><em>Seleziona un modello</em></MenuItem>
                  {printers.map((p) => (
                    <MenuItem key={p.id} value={p.model_name}>
                      {p.model_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Paper>

              <Paper elevation={3} sx={{ p: 4, borderRadius: 4, mb: 4, bgcolor: 'background.paper' }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, md: 9 }}>
                    <AutocompleteSearch
                      model={selectedModel}
                      onSelect={(code) => {
                        setCodeQuery(code);
                        handleErrorSearch(code);
                      }}
                      onQueryChange={setCodeQuery}
                      placeholder="Enter Error Code (e.g. C-XXXX)..."
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={() => handleErrorSearch()}
                      disabled={isPending || !selectedModel}
                      sx={{ height: 56, borderRadius: 3, bgcolor: '#005CAF' }}
                      startIcon={!isPending && <SearchIcon />}
                    >
                      {isPending ? <CircularProgress size={24} color="inherit" /> : 'Search'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {selectedModel && (
                <Box display="flex" justifyContent="center" mb={4}>
                  <Button
                    startIcon={<TuneIcon />}
                    onClick={() => setShowDipSwitches(true)}
                    variant="contained"
                    sx={{ borderRadius: 50, px: 4, py: 1.5, background: 'linear-gradient(45deg, #005CAF 30%, #4facfe 90%)' }}
                  >
                    {showDipSwitches ? 'DipSW Matrix Active' : 'Open DipSW Matrix'}
                  </Button>
                </Box>
              )}

              {showDipSwitches && selectedModel && (
                <DipSwitchViewer
                  model={selectedModel}
                  target={dipSwitchTarget}
                  onClose={() => { setShowDipSwitches(false); setDipSwitchTarget(null); }}
                />
              )}

              <Stack spacing={3}>
                {errorResults.map((err) => (
                  <ErrorCard key={err.id} error={err} onDipSwitchClick={onDipSwitchClick} model={selectedModel} />
                ))}
                {errorResults.length === 0 && !isPending && codeQuery && (
                  <Box textAlign="center" py={4} color="text.secondary">No exact match found.</Box>
                )}
              </Stack>
            </Box>
          )}

          {/* SPARE PARTS SECTION: Full Screen with Tabs */}
          {expandedSection === 'parts' && (
            <Box>
              <Button
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setExpandedSection(null);
                  setSelectedModel('');
                  setErrorResults([]);
                  setPartResults([]);
                  setActiveTab(0);
                }}
                sx={{ mb: 3, borderRadius: 2, px: 3, bgcolor: '#d32f2f' }}
              >
                Torna alla Home
              </Button>

              <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', mb: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, v) => setActiveTab(v)}
                  variant="fullWidth"
                  sx={{
                    bgcolor: 'background.paper',
                    '& .Mui-selected': {
                      color: activeTab === 0 ? '#005CAF' : '#FF512F',
                      fontWeight: 'bold'
                    },
                    '& .MuiTabs-indicator': {
                      bgcolor: activeTab === 0 ? '#005CAF' : '#FF512F'
                    }
                  }}
                >
                  <Tab icon={<SettingsIcon />} label="Spare Parts" iconPosition="start" />
                  <Tab icon={<PartIcon />} label="Maintenance" iconPosition="start" />
                </Tabs>
              </Paper>

              {/* === CONTENT: SPARE PARTS === */}
              {activeTab === 0 && (
                <Box>
                  <Paper elevation={3} sx={{ p: 4, borderRadius: 4, mb: 4 }}>
                    {/* Sub-Tabs for Parts */}
                    <Box display="flex" gap={2} mb={3} borderBottom={1} borderColor="divider" pb={2}>
                      <Button
                        onClick={() => setPartSearchMode('smart')}
                        variant={partSearchMode === 'smart' ? 'contained' : 'text'}
                        color="secondary"
                        sx={{ borderRadius: 20 }}
                      >
                        Smart Search
                      </Button>
                      <Button
                        onClick={() => setPartSearchMode('section')}
                        variant={partSearchMode === 'section' ? 'contained' : 'text'}
                        color="secondary"
                        sx={{ borderRadius: 20 }}
                      >
                        Browse Sections
                      </Button>

                      <Box flexGrow={1} />
                      <Button
                        variant="outlined"
                        startIcon={<FavoriteIcon />}
                        onClick={() => setIsCartOpen(true)}
                      >
                        Favorites ({cart.length})
                      </Button>
                    </Box>

                    {partSearchMode === 'smart' ? (
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <PartSearchAutocomplete
                            model="" // Global search (independent from selection)
                            onSelect={(part) => {
                              if (part) setPartResults([part]);
                            }}
                            onResults={(results) => {
                              setPartResults(results);
                            }}
                            placeholder="Search Part Code (Global Search)..."
                          />
                        </Grid>
                      </Grid>
                    ) : (
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            select
                            fullWidth
                            label="Seleziona Modello"
                            value={selectedModel}
                            onChange={(e) => {
                              setSelectedModel(e.target.value);
                              setPartSection('');
                              setPartResults([]);
                            }}
                            variant="outlined"
                            sx={{ minWidth: '400px' }}
                            InputProps={{
                              style: { fontSize: '1.2rem' }
                            }}
                            InputLabelProps={{
                              style: { fontSize: '1.1rem' }
                            }}
                          >
                            <MenuItem value=""><em>Seleziona un modello</em></MenuItem>
                            {printers.map((p) => (
                              <MenuItem key={p.id} value={p.model_name}>
                                {p.model_name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            select
                            fullWidth
                            label="Seleziona Sezione"
                            value={partSection}
                            onChange={(e) => setPartSection(e.target.value)}
                            disabled={!selectedModel}
                            variant="outlined"
                            sx={{ minWidth: '400px' }}
                            InputProps={{
                              style: { fontSize: '1.2rem' }
                            }}
                            InputLabelProps={{
                              style: { fontSize: '1.1rem' }
                            }}
                          >
                            <MenuItem value=""><em>Seleziona Sezione</em></MenuItem>
                            {partSectionsList.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                          </TextField>
                        </Grid>
                      </Grid>
                    )}
                  </Paper>

                  {/* Parts Results */}
                  {partResults.length > 0 && (
                    <Paper elevation={2} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                      <Box p={2} bgcolor="grey.50" borderBottom={1} borderColor="divider">
                        <Typography variant="h6">Results ({partResults.length})</Typography>
                      </Box>
                      <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell width={70}><b>Pg</b></TableCell>
                              <TableCell width={60}><b>Key</b></TableCell>
                              <TableCell><b>Model</b></TableCell>
                              <TableCell><b>Code</b></TableCell>
                              <TableCell><b>Name</b></TableCell>
                              <TableCell width={60}><b>Qty</b></TableCell>
                              <TableCell><b>Section</b></TableCell>
                              <TableCell width={80}><b>Fav</b></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {partResults.map((part, idx) => {
                              // Use Model + Page + Code + Section + Ref for TRUE uniqueness
                              const uniqueId = `${part.model}-${part.page_number}-${part.part_code}-${part.section_name}-${part.ref_number}`;
                              const isFav = cart.some(i => `${i.model}-${i.page_number}-${i.part_code}-${i.section_name}-${i.ref_number}` === uniqueId);

                              return (
                                <TableRow key={uniqueId || idx} hover>
                                  <TableCell>{part.page_number}</TableCell>
                                  <TableCell>{part.ref_number}</TableCell>
                                  <TableCell><Chip label={part.model} size="small" color="primary" variant="outlined" /></TableCell>
                                  <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 'bold' }}>
                                    {part.part_code}
                                  </TableCell>
                                  <TableCell>{part.name}</TableCell>
                                  <TableCell>{part.quantity}</TableCell>
                                  <TableCell><Chip label={part.section_name} size="small" /></TableCell>
                                  <TableCell>
                                    <IconButton
                                      color="primary"
                                      onClick={() => {
                                        if (isFav) {
                                          const itemToRemove = cart.find(c => `${c.model}-${c.page_number}-${c.part_code}-${c.section_name}-${c.ref_number}` === uniqueId);
                                          if (itemToRemove) removeFromCart(itemToRemove.cartId);
                                          toast.success('Removed from favorites');
                                        } else {
                                          addToCart(part);
                                        }
                                      }}
                                    >
                                      {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}
                </Box>
              )}

              {/* === CONTENT: MAINTENANCE === */}
              {activeTab === 1 && (
                <Box>
                  <Paper elevation={3} sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Maintenance Schedule
                    </Typography>

                    {/* Model Selector */}
                    <Box sx={{ mb: 3 }}>
                      <TextField
                        select
                        fullWidth
                        label="Select Model"
                        value={selectedMaintenanceModel}
                        onChange={(e) => setSelectedMaintenanceModel(e.target.value)}
                        variant="outlined"
                        sx={{ maxWidth: '400px' }}
                        InputProps={{
                          style: { fontSize: '1.2rem' }
                        }}
                        InputLabelProps={{
                          style: { fontSize: '1.1rem' }
                        }}
                      >
                        {Object.keys(maintenanceData).sort().map((model) => (
                          <MenuItem key={model} value={model}>
                            {model}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>

                    {maintenanceData[selectedMaintenanceModel]?.map((section, idx) => (
                      <Accordion key={idx}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography fontWeight="bold">{section.name}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell><b>Code</b></TableCell>
                                  <TableCell><b>Name</b></TableCell>
                                  <TableCell><b>Qty</b></TableCell>
                                  <TableCell><b>Life (Yield)</b></TableCell>
                                  <TableCell width={80}><b>Fav</b></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {section.items.map((item: any, i: number) => {
                                  // Construct a "Part" object for cart compatibility
                                  const maintenancePart: Part = {
                                    part_code: item.code,
                                    name: item.name,
                                    section_name: section.name, // Use maintenance section
                                    model: selectedMaintenanceModel, // Use selected maintenance model
                                    quantity: item.qty,
                                    page_number: item.page_key?.split('-')[0] || '',
                                    ref_number: `${section.name}-${i}`, // Use section name + index for uniqueness
                                  };

                                  const uniqueId = `${maintenancePart.model}-${maintenancePart.ref_number}-${maintenancePart.part_code}`;
                                  const isFav = cart.some(c => `${c.model}-${c.ref_number}-${c.part_code}` === uniqueId);

                                  return (
                                    <TableRow key={i} hover>
                                      <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 'bold' }}>
                                        {item.code}
                                      </TableCell>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell>{item.qty}</TableCell>
                                      <TableCell>{item.life}</TableCell>
                                      <TableCell>
                                        <IconButton
                                          color="primary"
                                          onClick={() => {
                                            if (isFav) {
                                              const itemToRemove = cart.find(c => `${c.model}-${c.ref_number}-${c.part_code}` === uniqueId);
                                              if (itemToRemove) removeFromCart(itemToRemove.cartId);
                                              toast.success('Removed from favorites');
                                            } else {
                                              addToCart(maintenancePart);
                                            }
                                          }}
                                        >
                                          {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Paper>
                </Box>
              )}
            </Box>
          )}




        </Stack>
      </Container>


      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        PaperProps={{ sx: { width: 350 } }}
      >
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center" borderBottom={1} borderColor="divider">
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <FavoriteIcon /> Favorites List
          </Typography>
          <Chip label={cart.length} color="primary" size="small" />
        </Box>
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {cart.length === 0 && <Box p={4} textAlign="center" color="text.secondary">Empty list.</Box>}
          {cart.map(item => (
            <div key={item.cartId}>
              <ListItem
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFromCart(item.cartId)} color="error"><DeleteIcon /></IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontFamily="monospace" fontWeight="bold">{item.part_code}</Typography>
                      <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = cart.map(c =>
                              c.cartId === item.cartId
                                ? { ...c, quantity: String(Math.max(1, parseInt(c.quantity || '1') - 1)) }
                                : c
                            );
                            setCart(updated);
                          }}
                        >
                          -
                        </IconButton>
                        <Chip label={item.quantity || '1'} size="small" />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = cart.map(c =>
                              c.cartId === item.cartId
                                ? { ...c, quantity: String(parseInt(c.quantity || '1') + 1) }
                                : c
                            );
                            setCart(updated);
                          }}
                        >
                          +
                        </IconButton>
                      </Box>
                    </Box>
                  }
                  secondary={`${item.name} | ${item.model} - ${item.section_name}`}
                />
              </ListItem>
              <Divider />
            </div>
          ))}
        </List>
        <Box p={2} borderTop={1} borderColor="divider" display="flex" flexDirection="column" gap={1}>
          <Button variant="outlined" color="error" fullWidth onClick={() => { setCart([]); toast.success('Favorites cleared'); }}>
            Empty Favorites
          </Button>
          <Box display="flex" gap={1}>
            <Button variant="outlined" startIcon={<CopyIcon />} onClick={copyCart} disabled={cart.length === 0} fullWidth>Copy</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={printCart} disabled={cart.length === 0} fullWidth>Print</Button>
          </Box>
        </Box>
      </Drawer>

    </Box>
  );
}