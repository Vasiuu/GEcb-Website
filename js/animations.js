/* ============================================
   GEC BHUJ - SCROLL ANIMATIONS
   Intersection Observer, Reveal Effects
   ============================================ */

(function() {
    'use strict';

    // ---- Intersection Observer for Scroll Reveals ----
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all elements with .reveal class
    function initRevealAnimations() {
        document.querySelectorAll('.reveal').forEach(el => {
            revealObserver.observe(el);
        });
    }

    // ---- Staggered Reveal for Lists ----
    function initStaggeredReveals() {
        const staggerContainers = document.querySelectorAll('[data-stagger]');

        staggerContainers.forEach(container => {
            const children = container.children;
            const baseDelay = parseInt(container.dataset.stagger) || 100;

            Array.from(children).forEach((child, index) => {
                child.classList.add('reveal');
                child.style.transitionDelay = `${index * baseDelay}ms`;
                revealObserver.observe(child);
            });
        });
    }

    // ---- Counter Animation for Stats ----
    function animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);

            element.textContent = current + (element.dataset.suffix || '');

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target + (element.dataset.suffix || '');
            }
        }

        requestAnimationFrame(update);
    }

    function initCounterAnimations() {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.target);
                    if (!isNaN(target)) {
                        animateCounter(el, target);
                    }
                    counterObserver.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('[data-counter]').forEach(el => {
            counterObserver.observe(el);
        });
    }

    // ---- Parallax Effect for Hero Images ----
    function initParallax() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');

        if (parallaxElements.length === 0) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.pageYOffset;
                    parallaxElements.forEach(el => {
                        const speed = parseFloat(el.dataset.parallax) || 0.5;
                        el.style.transform = `translateY(${scrollY * speed}px)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ---- Initialize All Animations ----
    function init() {
        initRevealAnimations();
        initStaggeredReveals();
        initCounterAnimations();
        initParallax();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-init after dynamic content loads (if needed)
    window.reinitAnimations = function() {
        initRevealAnimations();
        initStaggeredReveals();
    };
})();