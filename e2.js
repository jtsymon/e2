var e2 = [];
e2.mouse = {
    item: null,     // carried item
    ox: 0,          // offset-x of carried item
    oy: 0,          // offset-y of carried item
    x:  0,          // last detected mouse-x
    y:  0           // last detected mouse-y
};

function move_item(x, y, item) {
    "use strict";
    e2.mouse.item.element.style.left = x + "px";
    e2.mouse.item.element.style.top = y + "px";
    e2.mouse.item.x = x;
    e2.mouse.item.y = y;
}

function update_carried(x, y) {
    "use strict";
    if (e2.mouse.item !== null) {
        move_item(x - e2.mouse.ox, y - e2.mouse.oy, e2.mouse.item);
    }
}

/**
 * Searches the element structure and finds the lowest level container
 */
function find_container(x, y, exclude, parent) {
    "use strict";
    var i,
        child = null,
        container;
    // window.console.log("Looking for items intersecting (" + x + "," + y + ")");
    if (typeof parent === 'undefined' || parent === null) {
        parent = null;
        container = e2.root;
    } else {
        container = parent.children;
        x -= parent.x;
        y -= parent.y;
    }
    for (i = 0; i < container.length; i += 1) {
        if (container[i] === exclude) {
            window.console.log("EXCLUDED");
            window.console.log(container[i]);
        }
        if (container[i].type === 0 && container[i] !== exclude && x >= container[i].x && x <= container[i].x + container[i].width && y >= container[i].y && y <= container[i].y + container[i].height) {
            child = find_container(x, y, exclude, container[i]);
            if (child === null) {
                return container[i];
            } else {
                return child;
            }
        }
    }
    return parent;
}

function in_container(x, y, container) {
    "use strict";
    if (container === null) {
        return false;
    }
    var parent = container.parent;
    while (parent !== null) {
        x -= parent.x;
        y -= parent.y;
        parent = parent.parent;
    }
    return x >= container.x && x <= container.x + container.width && y >= container.y && y <= container.y + container.height;
}

function client_pos(x, y, container) {
    "use strict";
    while (container !== null) {
        x -= container.x;
        y -= container.y;
        container = container.parent;
    }
    return { x: x, y: y };
}

function abs_pos(x, y, container) {
    "use strict";
    while (container !== null) {
        x += container.x;
        y += container.y;
        container = container.parent;
    }
    return { x: x, y: y };
}

window.onmouseup = function (e) {
    "use strict";
    if (e2.mouse.item === null) {
        if (typeof e.target.e2_item !== 'undefined' && e.target.e2_item !== null) {
            e2.mouse.item = e.target.e2_item;
            e2.mouse.ox = e.clientX - e.target.e2_item.x;
            e2.mouse.oy = e.clientY - e.target.e2_item.y;
            update_carried(e.clientX, e.clientY);
        }
    } else {
        update_carried(e.clientX, e.clientY);
        var old_parent = e2.mouse.item.parent,
            rect = e2.mouse.item.element.getBoundingClientRect(),
            new_parent = find_container(rect.left, rect.top, e2.mouse.item),
            pos,
            index;
        if (new_parent !== old_parent) {
            window.console.log(new_parent);
            // remove the item from it's old parent
            if (old_parent === null) {
                document.body.removeChild(e2.mouse.item.element);
                index = e2.root.indexOf(e2.mouse.item);
                if (index !== -1) {
                    e2.root.splice(index, 1);
                }
            } else {
                old_parent.element.removeChild(e2.mouse.item.element);
                index = old_parent.children.indexOf(e2.mouse.item);
                if (index !== -1) {
                    old_parent.children.splice(index, 1);
                }
            }
            // add the item to it's new parent
            if (new_parent === null) {
                e2.mouse.item.parent = null;
                document.body.appendChild(e2.mouse.item.element);
                e2.root.push(e2.mouse.item);
            } else {
                e2.mouse.item.parent = new_parent;
                new_parent.element.appendChild(e2.mouse.item.element);
                new_parent.children.push(e2.mouse.item);
            }
            // correct the position (because position values are relative)
            pos = abs_pos(e2.mouse.item.x, e2.mouse.item.y, old_parent);
            pos = client_pos(pos.x, pos.y, new_parent);
            move_item(pos.x, pos.y, e2.mouse.item);
        }
        e2.mouse.item = null;
    }
};

window.onmousemove = function (e) {
    "use strict";
    update_carried(e.clientX, e.clientY);
    e2.mouse.x = e.clientX;
    e2.mouse.y = e.clientY;
};

window.onkeyup = function (e) {
    "use strict";
    switch (e.keyCode) {
    case 80: // p
        window.console.log(find_container(e2.mouse.x, e2.mouse.y));
        break;
    }
};

window.onload = function () {
    "use strict";
    var traverse_tree = function (parent, element, container) {
        var i,
            rect,
            item;
        if (parent !== null) {
            element = parent.element;
            container = parent.children;
        }
        for (i = 0; i < element.children.length; i += 1) {
            rect = element.children[i].getBoundingClientRect();
            item = {
                type: element.children[i].nodeName === "DIV" ? 0 : 1,   // 0 if the item is a container
                element: element.children[i],                           // reference to the DOM element
                parent: parent,                                         // reference to parent item
                children: [],                                           // array of child items
                x: rect.left,                                           // last known x position
                y: rect.top,                                            // last known y position
                width: rect.width,                                      // width of bounding box
                height: rect.height                                     // height of bounding box
            };
            element.children[i].e2_item = item;
            element.children[i].style.position = "absolute";
            container.push(item);
            traverse_tree(item);
        }
    };
    e2.root = [];
    traverse_tree(null, document.body, e2.root);
};