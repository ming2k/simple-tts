let selectionIcon = null;

document.addEventListener('mouseup', function(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    console.log('Selection detected:', selectedText); // Add debug logging

    // Remove existing icon if it exists
    if (selectionIcon) {
        document.body.removeChild(selectionIcon);
        selectionIcon = null;
    }

    // If there's selected text, show the icon
    if (selectedText) {
        console.log('Creating icon...'); // Add debug logging
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        selectionIcon = document.createElement('div');
        selectionIcon.className = 'selection-icon';
        
        // Simplified icon for testing
        selectionIcon.innerHTML = '🔍'; // Using emoji instead of image for initial testing
        
        // Position the icon near the selected text
        selectionIcon.style.position = 'fixed';
        selectionIcon.style.top = `${rect.top + window.scrollY - 30}px`;
        selectionIcon.style.left = `${rect.right + window.scrollX}px`;
        
        // Add click handler for the icon
        selectionIcon.addEventListener('click', function() {
            console.log('Icon clicked! Selected text:', selectedText);
        });

        document.body.appendChild(selectionIcon);
        console.log('Icon added to page'); // Add debug logging
    }
});

// Remove icon when clicking elsewhere
document.addEventListener('mousedown', function(e) {
    if (selectionIcon && !selectionIcon.contains(e.target)) {
        document.body.removeChild(selectionIcon);
        selectionIcon = null;
    }
});
