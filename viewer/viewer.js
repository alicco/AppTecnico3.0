let metadata = null;
let currentPage = null;

const pageSelect = document.getElementById('page-select');
const mainImage = document.getElementById('main-image');
const overlay = document.getElementById('overlay');
const status = document.getElementById('status');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

async function init() {
    try {
        // Assume metadata.json is in the images folder
        const response = await fetch('images/metadata.json');
        if (!response.ok) throw new Error('Failed to load metadata');
        metadata = await response.json();

        status.textContent = `Loaded ${metadata.pages.length} pages for ${metadata.model}`;

        // Populate select
        metadata.pages.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.manual_page;
            opt.textContent = `Page P${p.manual_page}`;
            pageSelect.appendChild(opt);
        });

        // Event listeners
        pageSelect.addEventListener('change', (e) => loadPage(e.target.value));
        prevBtn.addEventListener('click', () => navigate(-1));
        nextBtn.addEventListener('click', () => navigate(1));

        // Load first page if available
        if (metadata.pages.length > 0) {
            loadPage(metadata.pages[0].manual_page);
        }

    } catch (err) {
        status.textContent = 'Error: ' + err.message;
        console.error(err);
    }
}

function loadPage(pageNumber) {
    if (!pageNumber || !metadata) return;

    pageNumber = pageNumber.toString();
    const pageMeta = metadata.pages.find(p => p.manual_page.toString() === pageNumber);
    if (!pageMeta) return;

    currentPage = pageNumber;
    pageSelect.value = pageNumber;

    // Load image
    mainImage.src = `images/${pageMeta.image}`;

    // Clear overlay
    overlay.innerHTML = '';

    // Add keys
    const keys = metadata.keys[pageNumber];
    if (keys && keys.length > 0) {
        keys.forEach(k => {
            const marker = document.createElement('div');
            marker.className = 'key-marker';
            marker.style.left = `${k.x}%`;
            marker.style.top = `${k.y}%`;
            marker.textContent = k.key;
            marker.title = `Key: ${k.key}`;
            overlay.appendChild(marker);
        });
    }
}

function navigate(direction) {
    if (!metadata || !currentPage) return;
    const currentIndex = metadata.pages.findIndex(p => p.manual_page.toString() === currentPage);
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < metadata.pages.length) {
        loadPage(metadata.pages[nextIndex].manual_page);
    }
}

init();
