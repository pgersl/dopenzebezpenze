const navItem = document.querySelector('.nav-item');
const navDropdown = document.querySelector('.nav-links-dropdown');

navItem.addEventListener('click', () => {
    navDropdown.classList.toggle('toggled');
});

document.addEventListener('click', (event) => {
    if (!navItem.contains(event.target) && !navDropdown.contains(event.target)) {
        navDropdown.classList.remove('toggled');
    }
});