'use client';

import { useState, useEffect } from 'react';
import {
    Container, Box, Typography, Paper, Grid, TextField,
    MenuItem, Button, Stack, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Drawer, List, ListItem, ListItemText, Divider,
    Tabs, Tab, InputAdornment, Chip
} from '@mui/material';
import {
    ShoppingCart as CartIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Print as PrintIcon,
    Search as SearchIcon,
    Home as HomeIcon,
    ArrowForward as ArrowIcon,
    FilterAlt as FilterIcon
} from '@mui/icons-material';
import { Toaster, toast } from 'react-hot-toast';
import { PartSearchAutocomplete, Part } from '@/components/ui/PartSearchAutocomplete';

interface CartItem extends Part {
    cartId: string;
}

export default function PartsPage() {
    const [activeTab, setActiveTab] = useState(0); // 0: Simple, 1: Advanced
    const [model, setModel] = useState('');
    const [section, setSection] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Part[]>([]);
    const [loading, setLoading] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Lists for dropdowns
    const [models, setModels] = useState<string[]>([]);
    const [sections, setSections] = useState<string[]>([]);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        // Fetch Models
        fetch(`${API_BASE}/api/printers`)
            .then(res => res.json())
            .then((data: Array<{ model_name: string }>) => {
                const distinctModels = Array.from(new Set(data.map(p => p.model_name))).sort();
                setModels(distinctModels);
            })
            .catch(err => console.error(err));

        // Load cart
        const savedCart = localStorage.getItem('parts_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, [API_BASE]);

    useEffect(() => {
        localStorage.setItem('parts_cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        if (model) {
            fetch(`${API_BASE}/api/parts/sections?model=${model}`)
                .then(res => res.json())
                .then(data => setSections(data))
                .catch(err => console.error(err));
            setSection('');
        } else {
            setSections([]);
        }
    }, [model, API_BASE]);

    const searchParts = async () => {
        setLoading(true);
        let url = `${API_BASE}/api/parts?fuzzy=true`;

        if (activeTab === 1) { // Advanced
            if (!model) return;
            url += `&model=${model}`;
            if (section) url += `&section=${encodeURIComponent(section)}`;
            if (query) url += `&q=${encodeURIComponent(query)}`;
            url += '&limit=500';
        } else { // Simple
            if (!model) {
                toast.error('Please select a model first');
                setLoading(false);
                return;
            }
            url += `&model=${model}`;
            if (query) url += `&q=${encodeURIComponent(query)}`;
        }

        try {
            const res = await fetch(url);
            const data = await res.json();
            setResults(data);
        } catch (err) {
            toast.error('Search failed');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (part: Part) => {
        const newItem: CartItem = { ...part, cartId: Math.random().toString(36).substr(2, 9) };
        setCart([...cart, newItem]);
        toast.success('Added to cart');
        setIsSidebarOpen(true);
    };

    const removeFromCart = (cartId: string) => {
        setCart(cart.filter(item => item.cartId !== cartId));
    };

    const copyCart = () => {
        const text = cart.map(item => `${item.part_code} - ${item.name} (${item.model})`).join('\n');
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
                    <h1>Selected Spare Parts</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Model</th>
                                <th>Section</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cart.map(item => `
                                <tr>
                                    <td>${item.part_code}</td>
                                    <td>${item.name}</td>
                                    <td>${item.model}</td>
                                    <td>${item.section_name}</td>
                                </tr>
                            `).join('')}
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

            {/* Header / Nav */}
            <Paper elevation={1} sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
                <Container maxWidth="xl">
                    <Box py={2} display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={2}>
                            <Button startIcon={<HomeIcon />} href="/" color="inherit">
                                Home
                            </Button>
                            <Typography variant="h5" fontWeight="bold"
                                sx={{
                                    background: 'linear-gradient(45deg, #FF512F 30%, #DD2476 90%)',
                                    backgroundClip: 'text',
                                    textFillColor: 'transparent'
                                }}>
                                Spare Parts Search
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            startIcon={<CartIcon />}
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            color="primary"
                        >
                            Cart ({cart.length})
                        </Button>
                    </Box>
                </Container>
            </Paper>

            <Box display="flex">
                <Box flex={1} p={4}>
                    <Container maxWidth="lg">

                        {/* Search Controls */}
                        <Paper elevation={3} sx={{ p: 4, borderRadius: 4, mb: 4, bgcolor: 'background.paper' }}>
                            <Tabs
                                value={activeTab}
                                onChange={(e, v) => setActiveTab(v)}
                                sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
                            >
                                <Tab icon={<SearchIcon />} label="Smart Search" iconPosition="start" />
                                <Tab icon={<FilterIcon />} label="Advanced Browser" iconPosition="start" />
                            </Tabs>

                            <Grid container spacing={3} alignItems="flex-start">
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Select Model"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        variant="outlined"
                                        InputProps={{
                                            sx: { borderRadius: 3 }
                                        }}
                                    >
                                        <MenuItem value=""><em>Select Model</em></MenuItem>
                                        {models.map(m => (
                                            <MenuItem key={m} value={m}>{m}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                {activeTab === 0 ? (
                                    <Grid size={{ xs: 12, md: 8 }}>
                                        <PartSearchAutocomplete
                                            model={model}
                                            onSelect={(part) => {
                                                if (part) {
                                                    setQuery(part.part_code); // Optional: can trigger distinct search or just add directly
                                                    setResults([part]); // Show just this part or trigger search
                                                }
                                            }}
                                            onQueryChange={setQuery}
                                        />
                                    </Grid>
                                ) : (
                                    <>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                select
                                                fullWidth
                                                label="Select Section"
                                                value={section}
                                                onChange={(e) => setSection(e.target.value)}
                                                disabled={!model || sections.length === 0}
                                                variant="outlined"
                                                InputProps={{
                                                    sx: { borderRadius: 3 }
                                                }}
                                            >
                                                <MenuItem value=""><em>All Sections</em></MenuItem>
                                                {sections.map(s => (
                                                    <MenuItem key={s} value={s}>{s}</MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                size="large"
                                                onClick={searchParts}
                                                disabled={loading || !model}
                                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                                                sx={{
                                                    height: 56,
                                                    borderRadius: 3,
                                                    background: 'linear-gradient(45deg, #FF512F 30%, #DD2476 90%)',
                                                    color: 'white',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {loading ? 'Searching...' : 'Search'}
                                            </Button>
                                        </Grid>
                                    </>
                                )}
                            </Grid>
                        </Paper>

                        {/* Results Table */}
                        <Paper elevation={2} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                            <Box p={2} bgcolor="grey.50" borderBottom={1} borderColor="divider">
                                <Typography variant="h6" color="text.secondary">
                                    Results ({results.length})
                                </Typography>
                            </Box>
                            <TableContainer sx={{ maxHeight: 600 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Part Code</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Section</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Ref</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: 80 }}>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {results.length === 0 && !loading && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                                    <Typography color="text.secondary">
                                                        No parts found. Try selecting a model and searching.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {results.map((part, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                                                    {part.part_code}
                                                </TableCell>
                                                <TableCell>{part.name}</TableCell>
                                                <TableCell>
                                                    <Chip label={part.section_name} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell>{part.ref_number}</TableCell>
                                                <TableCell>
                                                    <IconButton color="primary" onClick={() => addToCart(part)}>
                                                        <CartIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                    </Container>
                </Box>

                {/* Cart Drawer */}
                <Drawer
                    anchor="right"
                    open={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    variant="persistent"
                    sx={{
                        width: 350,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: 350,
                            boxSizing: 'border-box',
                            borderLeft: '1px solid #e0e0e0',
                            boxShadow: isSidebarOpen ? -5 : 0
                        },
                    }}
                >
                    <Box display="flex" flexDirection="column" height="100%">
                        <Box p={3} bgcolor="grey.50" borderBottom={1} borderColor="divider" display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center" gap={1}>
                                <CartIcon color="primary" />
                                <Typography variant="h6" fontWeight="bold">Part List</Typography>
                            </Box>
                            <Chip label={cart.length} color="primary" size="small" />
                        </Box>

                        <List sx={{ flex: 1, overflow: 'auto' }}>
                            {cart.length === 0 && (
                                <Box p={4} textAlign="center">
                                    <Typography color="text.secondary" fontStyle="italic">
                                        Your list is empty.
                                    </Typography>
                                </Box>
                            )}
                            {cart.map((item) => (
                                <div key={item.cartId}>
                                    <ListItem
                                        secondaryAction={
                                            <IconButton edge="end" aria-label="delete" onClick={() => removeFromCart(item.cartId)} color="error" size="small">
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle2" fontWeight="bold" fontFamily="monospace" color="primary">
                                                    {item.part_code}
                                                </Typography>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="body2" component="span" display="block">{item.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.model} • {item.section_name}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                    <Divider component="li" />
                                </div>
                            ))}
                        </List>

                        <Box p={3} borderTop={1} borderColor="divider" gap={2} display="flex" flexDirection="column">
                            <Button
                                variant="outlined"
                                startIcon={<CopyIcon />}
                                onClick={copyCart}
                                disabled={cart.length === 0}
                                fullWidth
                            >
                                Copy List
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<PrintIcon />}
                                onClick={printCart}
                                disabled={cart.length === 0}
                                fullWidth
                                sx={{
                                    background: 'linear-gradient(45deg, #005CAF 30%, #4facfe 90%)',
                                    fontWeight: 'bold'
                                }}
                            >
                                Print List
                            </Button>
                        </Box>
                    </Box>
                </Drawer>
            </Box>
        </Box>
    );
}
