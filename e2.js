/*jslint browser: true, devel: true */
/*global e2 */

var Item;

/**
 * @param {number} x
 * @param {number} y
 */
function updateCarried(x, y) {
    "use strict";
    if (e2.mouse.item !== null) {
        e2.mouse.item.move(x - e2.mouse.ox, y - e2.mouse.oy);
    }
}

/**
 * Searches the element structure and finds the highest level container
 * @param {number} x
 * @param {number} y
 * @param {Item} exclude
 */
function findContainer(x, y, exclude) {
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

/**
 * @param {number} x
 * @param {number} y
 * @param {Item} container
 */
function inContainer(x, y, container) {
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

/**
 * @param {number} x
 * @param {number} y
 * @param {Item} container
 */
function clientPos(x, y, container) {
    "use strict";
    while (container !== e2.root) {
        x -= container.x;
        y -= container.y;
        container = container.parent;
    }
    return { x: x, y: y };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Item} container
 */
function absPos(x, y, container) {
    "use strict";
    while (container !== e2.root) {
        x += container.x;
        y += container.y;
        container = container.parent;
    }
    return { x: x, y: y };
}

/**
 * @param {Event} e
 */
function prevent(e) {
    "use strict";
    e.preventDefault();
}

/**
 * @param {MouseEvent} e
 */
window.onmouseup = function (e) {
    "use strict";
    switch (e.button) {
    case 0:
        console.log("left button");
        break;
    case 1:
        console.log("middle button");
        if (e2.mouse.item === null) {
            if (typeof e.target.e2_item !== 'undefined') {
                console.log(e.target);
                e2.mouse.item = e.target.e2_item;
                e2.mouse.ox = e.clientX - e.target.e2_item.x;
                e2.mouse.oy = e.clientY - e.target.e2_item.y;
                updateCarried(e.clientX, e.clientY);
            }
        } else {
            updateCarried(e.clientX, e.clientY);
            e2.mouse.item.placeDown(e.clientX, e.clientY);
            e2.mouse.item = null;
        }
        break;
    case 2:
        console.log("right button");
        if (e2.mouse.item === null) {
            if (typeof e.target.e2_item !== 'undefined') {
                var item = e.target.e2_item.clone();
                e2.mouse.item = item;
                e2.mouse.ox = e.clientX - item.x;
                e2.mouse.oy = e.clientY - item.y;
                updateCarried(e.clientX, e.clientY);
            }
        }
        break;
    }
};

/**
 * @param {MouseEvent} e
 */
window.onmousemove = function (e) {
    "use strict";
    updateCarried(e.clientX, e.clientY);
    e2.mouse.x = e.clientX;
    e2.mouse.y = e.clientY;
};

/**
 * @param {KeyboardEvent} e
 */
window.onkeyup = function (e) {
    "use strict";
    switch (e.keyCode) {
    case 80: // p
        window.console.log(findContainer(e2.mouse.x, e2.mouse.y));
        break;
    }
};

/**
 * Creates items beneath an element
 * WARNING: Will create duplicate items if the item has already been accounted for
 * @param {Element} parent
 */
function createItems(parent) {
    "use strict";
    var i,
        rect,
        item,
        container,
        pos;
    for (i = 0; i < parent.element.children.length; i += 1) {
        createItems(new Item(parent, parent.element.children[i]));
    }
}

window.onload = function () {
    "use strict";
    window.oncontextmenu = prevent;
    window.e2 = {
        mouse: {
            /**
             * @type {Item}
             */
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
    createItems(e2.root);
};

/**
 * @this {Item}
 * @constructor
 * @param {Item} parent
 * @param {Element} element
 */
function Item(parent, element) {
    "use strict";
    this.type = element.nodeName === "DIV" ? 0 : 1;
    this.depth = parent.depth + 1;
    this.element = element;
    this.parent = parent;
    this.parent_container = null;
    this.children = [];
    this.containers = [];
    if (element.style.left === "") {
        element.style.left = "0px";
    }
    if (element.style.top === "") {
        element.style.top = "0px";
    }
    var rect = element.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    rect = clientPos(rect.left, rect.top, parent);
    this.x = rect.x;
    this.y = rect.y;
    element.e2_item = this;
    element.style.position = "absolute";
    parent.children.push(this);
    this.findContainer();
}

/**
 * @this {Item}
 * @param {number} x
 * @param {number} y
 */
Item.prototype.move = function (x, y) {
    "use strict";
    this.element.style.left = x + "px";
    this.element.style.top = y + "px";
    this.x = x;
    this.y = y;
};

/**
 * @this {Item}
 */
Item.prototype.findContainer = function () {
    "use strict";
    if (this.type !== 0) {
        return;
    }
    var index,
        container = this.parent,
        rect;
    if (this.parent_container !== null) {
        index = this.parent_container.containers.indexOf(this);
        if (index !== -1) {
            this.parent_container.containers.splice(index, 1);
        }
    }
    rect = {
        left: this.x,
        right: this.x + this.width,
        top: this.y,
        bottom: this.y + this.height
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
    this.parent_container = container;
    container.containers.push(this);
};

/**
 * @this {Item}
 * @param {number} x
 * @param {number} y
 */
Item.prototype.placeDown = function (x, y) {
    "use strict";
    var new_parent = findContainer(x, y, this),
        pos,
        index;
    if (new_parent !== this.parent) {
        // find the correct position
        pos = absPos(this.x, this.y, this.parent);
        pos = clientPos(pos.x, pos.y, new_parent);
        // remove the item from it's old parent
        this.parent.element.removeChild(this.element);
        index = this.parent.children.indexOf(this);
        if (index !== -1) {
            this.parent.children.splice(index, 1);
        }
        // add the item to it's new parent
        this.parent = new_parent;
        this.depth = new_parent.depth + 1;
        new_parent.element.appendChild(this.element);
        new_parent.children.push(this);
        // correct the position (because position values are relative)
        this.move(pos.x, pos.y);
        // update the container tree
        this.findContainer();
    }
};

/**
 * @this {Item}
 */
Item.prototype.clone = function () {
    "use strict";
    var element = this.element.cloneNode(true),
        clone;
    this.parent.element.appendChild(element);
    clone = new Item(this.parent, element);
    createItems(clone);
    return clone;
};