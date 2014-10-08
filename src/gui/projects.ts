function generateList(data: string, listId: string) {
    var items = JSON.parse(data);

    for (var i = 0; i < items.length; i++) {
        $(listId).append('<li><a href=\"#\">' + items[i].title + '</a></li>');
    }
}

function save() {
    
}

function load(key: string) {
    if (!this.isCompatible()) {
        return;
    }

    return localStorage[key];
}

function isCompatible() {
    return typeof(Storage) !== 'undefined';
}
