(function () {
    const container = document.getElementById('vis3');
    if (!container) return;

    const billsLayer = document.getElementById('vis3-bills');
    const walletArea = container.querySelector('.vis3-wallet-area');
    const tooltip = document.getElementById('vis3-tooltip');
    const statusText = document.getElementById('vis3-status-text');
    const genreSelect = document.getElementById('vis3-genre-filter');
    const scoreSlider = document.getElementById('vis3-score-slider');
    const scoreValue = document.getElementById('vis3-score-value');
    const tierButtons = container.querySelectorAll('.vis3-tier-btn');

    if (!billsLayer || !walletArea || !tooltip) return;

    const reviewTiers = {
        blockbuster: { min: 5000, max: Number.POSITIVE_INFINITY },
        indie: { min: 500, max: 4999 },
        sleeper: { min: 50, max: 499 }
    };

    const billsConfig = [
        {
            id: 'one',
            label: '$1',
            value: 1,
            left: '5%',
            rotation: '-12deg',
            layer: 1,
            image: 'images/bills/one_bill.jpg',
            minPrice: 0,
            maxPrice: 2
        },
        {
            id: 'five',
            label: '$5',
            value: 5,
            left: '18%',
            rotation: '-7deg',
            layer: 2,
            image: 'images/bills/five_bill.jpg',
            minPrice: 2,
            maxPrice: 5
        },
        {
            id: 'ten',
            label: '$10',
            value: 10,
            left: '32%',
            rotation: '-2deg',
            layer: 3,
            image: 'images/bills/ten_bill.jpg',
            minPrice: 5,
            maxPrice: 10
        },
        {
            id: 'twenty',
            label: '$20',
            value: 20,
            left: '46%',
            rotation: '2deg',
            layer: 4,
            image: 'images/bills/twenty_bill.jpg',
            minPrice: 10,
            maxPrice: 20
        },
        {
            id: 'fifty',
            label: '$50',
            value: 50,
            left: '60%',
            rotation: '6deg',
            layer: 5,
            image: 'images/bills/fifty_bill.jpg',
            minPrice: 20,
            maxPrice: 50
        },
        {
            id: 'hundred',
            label: '$100',
            value: 100,
            left: '74%',
            rotation: '10deg',
            layer: 6,
            image: 'images/bills/hundred_bill.jpg',
            minPrice: 50,
            maxPrice: Number.POSITIVE_INFINITY
        }
    ];

    let games = [];
    let currentTier = 'blockbuster';
    let currentGenre = 'all';
    let minScore = scoreSlider ? Number(scoreSlider.value) : 80;

    buildBills();
    attachControlEvents();
    loadData();

    function buildBills() {
        billsLayer.innerHTML = '';
        billsConfig.forEach((billConfig) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vis3-bill';
            button.style.setProperty('--bill-left', billConfig.left);
            button.style.setProperty('--bill-rotation', billConfig.rotation);
            button.style.setProperty('--bill-layer', billConfig.layer);
            button.dataset.billValue = billConfig.value;
            button.dataset.billLabel = billConfig.label;
            button.setAttribute('aria-label', `${billConfig.label} budget`);

            if (billConfig.image) {
                const img = new Image();
                img.src = billConfig.image;
                img.alt = `${billConfig.label} bill`;
                button.appendChild(img);
            }

            const label = document.createElement('div');
            label.className = 'bill-label';
            label.textContent = billConfig.label;
            button.appendChild(label);

            button.addEventListener('mouseenter', () => handleBillHover(button));
            button.addEventListener('focus', () => handleBillHover(button));
            button.addEventListener('mousemove', (evt) => updateTooltipPosition(evt, button));
            button.addEventListener('mouseleave', hideTooltip);
            button.addEventListener('blur', hideTooltip);

            billConfig.element = button;
            billsLayer.appendChild(button);
        });
    }

    function attachControlEvents() {
        if (scoreSlider && scoreValue) {
            scoreValue.textContent = scoreSlider.value;
            scoreSlider.addEventListener('input', () => {
                minScore = Number(scoreSlider.value);
                scoreValue.textContent = scoreSlider.value;
                updateRecommendations();
            });
        }

        if (genreSelect) {
            genreSelect.addEventListener('change', () => {
                currentGenre = genreSelect.value;
                updateRecommendations();
            });
        }

        tierButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const newTier = button.dataset.tier;
                if (!newTier || newTier === currentTier) return;
                currentTier = newTier;
                setTierButtonState();
                updateRecommendations();
            });
        });

        setTierButtonState();
    }

    function loadData() {
        if (typeof d3 === 'undefined' || !d3.csv) {
            statusText.textContent = 'D3 library not loaded.';
            statusText.classList.add('warning');
            return;
        }

        d3.csv('data/cleaned_steam_data.csv', formatRow)
            .then((dataset) => {
                games = dataset.filter((d) => d.title);
                populateGenreOptions();
                updateRecommendations();
            })
            .catch((err) => {
                console.error('Unable to load Steam data for vis3.', err);
                statusText.textContent = 'Unable to load game data. Please refresh.';
                statusText.classList.add('warning');
            });
    }

    function formatRow(row) {
        return {
            title: (row.Title || '').trim(),
            reviews: parseNumber(row['Reviews Total']),
            score: parseNumber(row['Reviews Score']),
            releaseDate: row['Release Date'] || '',
            price: parsePrice(row['Launch Price']),
            tags: parseTags(row.Tags),
            genre: (row.Genre || 'Other').trim()
        };
    }

    function parseNumber(value) {
        if (value === null || value === undefined) return 0;
        const numeric = Number(String(value).replace(/,/g, ''));
        return Number.isNaN(numeric) ? 0 : numeric;
    }

    function parsePrice(value) {
        if (value === null || value === undefined) return 0;
        const cleaned = String(value).replace(/[^0-9.]/g, '');
        const numeric = parseFloat(cleaned);
        return Number.isNaN(numeric) ? 0 : numeric;
    }

    function parseTags(tagString) {
        if (!tagString) return [];
        try {
            const normalized = tagString.replace(/'/g, '"');
            const parsed = JSON.parse(normalized);
            return Array.isArray(parsed) ? parsed.map((tag) => tag.trim().toLowerCase()) : [];
        } catch (err) {
            return [];
        }
    }

    function populateGenreOptions() {
        if (!genreSelect) return;
        const genres = Array.from(
            new Set(games.map((game) => game.genre).filter((g) => !!g))
        ).sort((a, b) => a.localeCompare(b));
        const fragment = document.createDocumentFragment();
        const defaultOption = document.createElement('option');
        defaultOption.value = 'all';
        defaultOption.textContent = 'All genres';
        fragment.appendChild(defaultOption);
        genres.forEach((genre) => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            fragment.appendChild(option);
        });
        genreSelect.innerHTML = '';
        genreSelect.appendChild(fragment);
        genreSelect.value = 'all';
    }

    function updateRecommendations() {
        if (!games.length) return;

        const tier = reviewTiers[currentTier];
        const filtered = games.filter((game) => {
            if (game.score < minScore) return false;
            if (currentGenre !== 'all' && game.genre !== currentGenre) return false;
            return game.reviews >= tier.min && game.reviews <= tier.max;
        });

        let hasMatch = false;
        billsConfig.forEach((bill) => {
            const recommendation = selectGameForBill(filtered, bill);
            bill.element.__game = recommendation || null;
            if (recommendation) {
                hasMatch = true;
                bill.element.setAttribute(
                    'aria-label',
                    `${bill.label} budget best pick: ${recommendation.title}`
                );
            } else {
                bill.element.setAttribute(
                    'aria-label',
                    `${bill.label} budget currently has no matching games`
                );
            }
        });

        if (hasMatch) {
            statusText.textContent = 'Hover a bill to see the best-matched game.';
            statusText.classList.remove('warning');
        } else {
            statusText.textContent = 'No games match the selected filters. Try relaxing them.';
            statusText.classList.add('warning');
            hideTooltip();
        }
    }

    function setTierButtonState() {
        tierButtons.forEach((button) => {
            const isActive = button.dataset.tier === currentTier;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function selectGameForBill(gamesPool, bill) {
        const min = typeof bill.minPrice === 'number' ? bill.minPrice : 0;
        const max =
            typeof bill.maxPrice === 'number' ? bill.maxPrice : bill.value + Number.EPSILON;

        const candidates = gamesPool.filter(
            (game) => game.price > min && game.price <= max
        );

        if (!candidates.length) return null;

        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.reviews !== a.reviews) return b.reviews - a.reviews;
            return a.price - b.price;
        });

        return candidates[0];
    }

    function handleBillHover(bill) {
        const game = bill.__game;
        tooltip.innerHTML = formatTooltipContent(game, bill.dataset.billLabel);
        tooltip.style.display = 'block';
        positionTooltipFromBill(bill);
    }

    function formatTooltipContent(game, billLabel) {
        if (!game) {
            return `<strong>No match</strong><div class="vis3-tooltip-meta">${billLabel} budget</div><p>Loosen the filters to see a recommendation here.</p>`;
        }

        const priceText = game.price <= 0.01 ? 'Free to play' : `$${game.price.toFixed(2)}`;
        const dateText = formatDate(game.releaseDate);
        const tags = game.tags.slice(0, 3).map((tag) => tag.replace(/\b\w/g, (c) => c.toUpperCase())).join(', ');

        return `
            <strong>${game.title}</strong>
            <div class="vis3-tooltip-meta">${billLabel} budget · ${priceText}</div>
            <ul>
                <li>Review score: ${game.score}</li>
                <li>Total reviews: ${game.reviews.toLocaleString()}</li>
                <li>Release: ${dateText}</li>
                <li>Genre: ${game.genre}</li>
            </ul>
            ${tags ? `<div>Top tags: ${tags}</div>` : ''}
        `;
    }

    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return dateString;
        return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }

    function updateTooltipPosition(evt, bill) {
        if (tooltip.style.display !== 'block') return;
        const areaRect = walletArea.getBoundingClientRect();
        const x = evt.clientX - areaRect.left + 5;
        const y = evt.clientY - areaRect.top - 5;
        moveTooltip(x, y);
    }

    function positionTooltipFromBill(bill) {
        const billRect = bill.getBoundingClientRect();
        const areaRect = walletArea.getBoundingClientRect();
        const x = billRect.left - areaRect.left + billRect.width / 2;
        const y = billRect.top - areaRect.top - 10;
        moveTooltip(x, y);
    }

    function moveTooltip(x, y) {
        const maxX = walletArea.clientWidth - tooltip.offsetWidth - 10;
        const maxY = walletArea.clientHeight - tooltip.offsetHeight - 10;
        tooltip.style.left = `${Math.max(10, Math.min(x, Math.max(10, maxX)))}px`;
        tooltip.style.top = `${Math.max(10, Math.min(y, Math.max(10, maxY)))}px`;
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
    }
})();
