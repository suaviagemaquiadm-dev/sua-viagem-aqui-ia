document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        const toggle = () => {
            const isOpen = item.classList.contains('open');
            // Fecha todos os outros itens para funcionar como um acordeão
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('open')) {
                    otherItem.classList.remove('open');
                    otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                }
            });
            // Alterna o item clicado
            item.classList.toggle('open');
            question.setAttribute('aria-expanded', String(!isOpen));
        };

        question.addEventListener('click', toggle);

        // Adiciona suporte para teclado (WCAG)
        question.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle();
            }
        });
    });
});
