var show_msg = '';

function nocontextmenu(e) { return false; }
document.oncontextmenu = nocontextmenu;
document.ondragstart = function() { return false;}

document.onmousedown = function (event) {
    event = (event || window.event);
    if (event.keyCode === 123) {
        return false;
    }
}

document.onkeydown = function (event) {
    event = (event || window.event);
    if (event.keyCode === 123 ||
        event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 75) ||
        event.ctrlKey && event.keyCode === 85) {
        return false;
    }
}

function addMultiEventListener(element, eventNames) {
    var events = eventNames.split(' ');
    for (var i = 0, iLen = events.length; i < iLen; i++) {
        element.addEventListener(events[i], function (e) {
            e.preventDefault();
        });
    }
}

addMultiEventListener(document, 'contextmenu');
addMultiEventListener(document, 'cut copy paste print');
addMultiEventListener(document, 'drag drop');