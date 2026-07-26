/* ============================================
   GEC BHUJ - MAIN JAVASCRIPT
   Navigation, Mobile Menu, Active States, Dropdowns
   ============================================ */

(function() {
    'use strict';

    // ---- Mobile Menu ----
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('menu-icon');
    let isMenuOpen = false;

    function toggleMobileMenu() {
        isMenuOpen = !isMenuOpen;
        if (mobileMenu) mobileMenu.classList.toggle('open', isMenuOpen);
        if (menuIcon) menuIcon.textContent = isMenuOpen ? 'close' : 'menu';
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    }

    function closeMobileMenu() {
        isMenuOpen = false;
        if (mobileMenu) mobileMenu.classList.remove('open');
        if (menuIcon) menuIcon.textContent = 'menu';
        document.body.style.overflow = '';
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) closeMobileMenu();
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    // ---- Quick Links Dropdown ----
    const quickLinksBtn = document.getElementById('quick-links-btn');
    const quickLinksDropdown = document.getElementById('quick-links-dropdown');
    const quickLinksIcon = document.getElementById('quick-links-icon');
    let isDropdownOpen = false;

    function toggleDropdown(e) {
        if (e) e.stopPropagation();
        isDropdownOpen = !isDropdownOpen;
        if (quickLinksDropdown) quickLinksDropdown.classList.toggle('open', isDropdownOpen);
        if (quickLinksIcon) quickLinksIcon.style.transform = isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    function closeDropdown() {
        isDropdownOpen = false;
        if (quickLinksDropdown) quickLinksDropdown.classList.remove('open');
        if (quickLinksIcon) quickLinksIcon.style.transform = 'rotate(0deg)';
    }

    if (quickLinksBtn) {
        quickLinksBtn.addEventListener('click', toggleDropdown);
    }

    document.addEventListener('click', (e) => {
        if (quickLinksBtn && quickLinksDropdown) {
            if (!quickLinksBtn.contains(e.target) && !quickLinksDropdown.contains(e.target)) {
                closeDropdown();
            }
        }
    });

    // ---- Active Section Navigation (for single-page) ----
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    function updateActiveNav() {
        if (sections.length === 0) return;

        const scrollPos = window.scrollY + 120;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });

                mobileNavLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // ---- Header Scroll Effect ----
    const header = document.getElementById('main-header');

    function handleScroll() {
        const currentScroll = window.pageYOffset;

        if (header) {
            if (currentScroll > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }

        updateActiveNav();
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ---- Smooth Scroll for INTERNAL Anchor Links ONLY ----
    // FIXED: Only intercept links that point to actual sections on THIS page
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#" or empty
            if (href === '#' || !href) return;
            
            // Check if target section exists on THIS page
            const target = document.querySelector(href);
            
            // Only prevent default if the target section actually exists on current page
            // If target doesn't exist (e.g., linking to another page), let browser handle it normally
            if (target) {
                e.preventDefault();
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
            // If target is null, the link is for another page - let browser navigate normally
        });
    });

    // ---- Initialize on Load ----
    document.addEventListener('DOMContentLoaded', () => {
        handleScroll();
    });

    // Expose functions globally for inline onclick handlers
    window.closeMobileMenu = closeMobileMenu;
    window.toggleMobileMenu = toggleMobileMenu;
})();