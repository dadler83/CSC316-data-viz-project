

const q0_submit = document.getElementById('q0-interaction');
const q0 = document.getElementById('q0');
const a0 = document.getElementById('q0-a0');
const a1 = document.getElementById('q0-a1');
const vis = document.getElementById('vis0');
const gameboys = document.getElementById('gameboy-img');

q0_submit.addEventListener('click', (e) => {
    q0.style.display = 'none';
    a0.style.display = 'block';
    gameboys.style.display = 'none';
    vis.style.display = 'block';
    window.scrollTo({ top: screen.height, behavior: 'instant' });
})