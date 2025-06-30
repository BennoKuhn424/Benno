// PayFast success route handling
app.get('/success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

app.get('/success', (req, res) => {
    res.redirect('/success.html?' + req.url.split('?')[1] || '');
});

// Fallback route
app.get('*', (req, res) => {
    if (req.path.includes('success')) {
        res.redirect('/shop.html?payfast_success=true&' + (req.url.split('?')[1] || ''));
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});