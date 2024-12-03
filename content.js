let selectionIcon = null;

document.addEventListener('mouseup', function(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // Remove existing icon if it exists
    if (selectionIcon) {
        document.body.removeChild(selectionIcon);
        selectionIcon = null;
    }

    // If there's selected text, show the icon
    if (selectedText) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        selectionIcon = document.createElement('div');
        selectionIcon.className = 'selection-icon';
        selectionIcon.innerHTML = '<img src="' + chrome.runtime.getURL("src/assets/icons/icon-48.svg") + '" width="16" height="16">';
        
        // Position the icon near the selected text
        selectionIcon.style.position = 'fixed';
        selectionIcon.style.top = `${rect.top + window.scrollY - 30}px`;
        selectionIcon.style.left = `${rect.right + window.scrollX}px`;
        
        // Add click handler for the icon
        selectionIcon.addEventListener('click', function() {
            // Add your icon click handling logic here
            console.log('Selected text:', selectedText);
        });

        document.body.appendChild(selectionIcon);
    }
});

// Remove icon when clicking elsewhere
document.addEventListener('mousedown', function(e) {
    if (selectionIcon && !selectionIcon.contains(e.target)) {
        document.body.removeChild(selectionIcon);
        selectionIcon = null;
    }
}); 