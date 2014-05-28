/*jslint browser: true, devel: true */
/*global e2 */
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
 * Searches the element structure and finds the highest level container
 */
function find_container(x, y, exclude) {
    "use strict";
    function internal_find_container(x, y, parent) {
        var i,
            best = parent,
            next,
            cx,
            cy;
        for (i = 0; i < parent.containers.length; i += 1) {
            next = parent.containers[i];
            if (next !== exclude) {
                cx = x;
                cy = y;
                while (next.parent !== parent) {
                    next = next.parent;
                    cx -= next.x;
                    cy -= next.y;
                }
                next = parent.containers[i];
                if (cx >= next.x && cx <= next.x + next.width &&
                        cy >= next.y && cy <= next.y + next.height) {
                    next = internal_find_container(cx, cy, next);
                    if (next.depth > best.depth) {
                        best = next;
                    }
                }
            }
        }
        return best;
    }
    return internal_find_container(x, y, e2.root);
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
    while (container !== e2.root) {
        x -= container.x;
        y -= container.y;
        container = container.parent;
    }
    return { x: x, y: y };
}

function abs_pos(x, y, container) {
    "use strict";
    while (container !== e2.root) {
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
        var item = e2.mouse.item,
            new_parent = find_container(e.clientX, e.clientY, item),
            pos,
            index;
        if (new_parent !== item.parent) {
            window.console.log(item.parent);
            window.console.log(new_parent);
            // find the correct position
            pos = abs_pos(item.x, item.y, item.parent);
            pos = client_pos(pos.x, pos.y, new_parent);
            // remove the item from it's old parent
            item.parent.element.removeChild(item.element);
            index = item.parent.children.indexOf(item);
            if (index !== -1) {
                item.parent.children.splice(index, 1);
            }
            if (item.type === 0) {
                index = item.parent_container.containers.indexOf(item);
                if (index !== -1) {
                    item.parent_container.containers.splice(index, 1);
                }
            }
            // add the item to it's new parent
            item.parent = new_parent;
            item.depth = new_parent.depth + 1;
            new_parent.element.appendChild(item.element);
            new_parent.children.push(item);
            // correct the position (because position values are relative)
            move_item(pos.x, pos.y, item);
            // update the container tree
            if (item.type === 0) {
                pos = {
                    left: item.x,
                    right: item.x + item.width,
                    top: item.y,
                    bottom: item.y + item.height
                };
                console.log("test");
                console.log(new_parent);
                console.log(pos);
                while (new_parent.parent !== null &&
                        (pos.left < 0 || pos.right > new_parent.width ||
                         pos.top < 0 || pos.bottom > new_parent.height)) {
                    pos.left += new_parent.x;
                    pos.right += new_parent.x;
                    pos.top += new_parent.y;
                    pos.bottom += new_parent.y;
                    new_parent = new_parent.parent;
                    console.log("up");
                    console.log(new_parent);
                    console.log(pos);
                }
                item.parent_container = new_parent;
                new_parent.containers.push(item);
            }
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
    var traverse_tree = function (parent) {
        var i,
            rect,
            item,
            container;
        for (i = 0; i < parent.element.children.length; i += 1) {
            rect = parent.element.children[i].getBoundingClientRect();
            item = {
                type: parent.element.children[i].nodeName === "DIV" ? 0 : 1,   // 0 if the item is a container
                depth: parent.depth + 1,
                element: parent.element.children[i],                           // reference to the DOM element
                parent: parent,
                parent_container: null,
                children: [],
                containers: [],
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
            parent.element.children[i].e2_item = item;
            parent.element.children[i].style.position = "absolute";
            parent.children.push(item);
            if (item.type === 0) {
                container = parent;
                rect = {
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    bottom: rect.bottom
                };
                while (container.parent !== null &&
                        (rect.left < 0 || rect.right > container.width ||
                         rect.top < 0 || rect.bottom > container.height)) {
                    rect.left += container.x;
                    rect.right += container.x;
                    rect.top += container.y;
                    rect.bottom += container.y;
                    container = container.parent;
                }
                item.parent_container = container;
                container.containers.push(item);
            }
            traverse_tree(item);
        }
    };
    window.e2 = {
        mouse: {
            item: null,     // carried item
            ox: 0,          // offset-x of carried item
            oy: 0,          // offset-y of carried item
            x:  0,          // last detected mouse-x
            y:  0           // last detected mouse-y
        },
        root: {
            type: 0,
            depth: 0,
            element: document.body,
            parent: null,
            children: [],
            containers: [],
            x: 0,
            y: 0
        }
    };
    traverse_tree(e2.root);
};
