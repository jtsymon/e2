/*jslint browser: true, devel: true */
/*global e2 */

var Item;
var e2 = {
    mouse: {
        /**
         * @type {Item}
         */
        item: null,     // carried item
        left: false,
        middle: false,
        right: false,
        ox: 0,          // offset-x of carried item
        oy: 0,          // offset-y of carried item
        x:  0,          // last detected mouse-x
        y:  0,          // last detected mouse-y
        update: function () {
            "use strict";
            if (e2.mouse.item !== null) {
                e2.mouse.item.move(e2.mouse.x - e2.mouse.ox, e2.mouse.y - e2.mouse.oy);
            }
        }
    },
    root: null
};
var actions = {};

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
 * Sets position:relative on elements that are children of a non-container element
 * @param {Element} parent
 */
function relativePosition(parent) {
    "use strict";
    var i;
    for (i = 0; i < parent.children.length; i += 1) {
        parent.children[i].style.position = "relative";
        relativePosition(parent.children[i]);
    }
}

/**
 * Creates items beneath an element
 * @param {Item} parent
 */
function createItems(parent) {
    "use strict";
    if (!parent.isContainer) {
        relativePosition(parent.element);
        return;
    }
    var i,
        rect,
        item,
        container,
        pos;
    for (i = 0; i < parent.element.children.length; i += 1) {
        if (!parent.element.children[i].e2_item) {
            createItems(new Item(parent, parent.element.children[i]));
        }
    }
}

/**
 * Gets the parent item for an element that is a child of a non-container element
 * @param {Element} element
 */
function getItem(element) {
    "use strict";
    while (!element.e2_item) {
        element = element.parentElement;
    }
    return element.e2_item;
}

/**
 * @param {Event} e
 */
function prevent(e) {
    "use strict";
    e.preventDefault();
}

/**
 * @param {Item} item
 */
actions.pickup = function (item) {
    "use strict";
    if (!item) {
        return;
    }
    e2.mouse.item = item;
    e2.mouse.ox = e2.mouse.x - item.x;
    e2.mouse.oy = e2.mouse.y - item.y;
    e2.mouse.update();
};

/**
 * @param {Item} item
 */
actions.clone = function (item) {
    "use strict";
    if (!item) {
        return;
    }
    actions.pickup(item.clone());
};

actions.place = function () {
    "use strict";
    e2.mouse.update();
    e2.mouse.item.placeDown(e2.mouse.x, e2.mouse.y);
    e2.mouse.item = null;
};

actions.stamp = function () {
    "use strict";
    console.log("stamping");
};

actions.remove = function () {
    "use strict";
    console.log("removing");
    e2.mouse.item.remove();
    e2.mouse.item = null;
};

/**
 * @param {MouseEvent} e
 */
window.onmousedown = function (e) {
    "use strict";
    switch (e.button) {
    case 0:
        e2.mouse.left = true;
        break;
    case 1:
        e2.mouse.middle = true;
        break;
    case 2:
        e2.mouse.right = true;
        break;
	}
};

/**
 * @param {MouseEvent} e
 */
window.onmouseup = function (e) {
    "use strict";
    // delete
    switch (e.button) {
    case 0:
        e2.mouse.left = false;
        break;
    case 1:
        e2.mouse.middle = false;
        if (e2.mouse.right && !e2.mouse.left) {
            if (e2.mouse.item !== null) {
                actions.remove();
            }
        } else {
            if (e2.mouse.item !== null) {
                actions.place();
            } else {
                actions.pickup(getItem(e.target));
            }
        }
        break;
    case 2:
        e2.mouse.right = false;
        if (e2.mouse.middle && !e2.mouse.left) {
            if (e2.mouse.item !== null) {
                actions.remove();
            }
        } else {
            if (e2.mouse.item !== null) {
                actions.stamp();
            } else {
                actions.clone(getItem(e.target));
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
    e2.mouse.x = e.clientX;
    e2.mouse.y = e.clientY;
    e2.mouse.update();
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

window.onload = function () {
    "use strict";
    window.oncontextmenu = prevent;
    window.e2.root = {
        isContainer: true,
        depth: 0,
        element: document.body,
        children: [],
        containers: []
    };
    document.body.e2_item = e2.root;
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
    this.isContainer = (element.nodeName === "DIV");
    this.depth = parent.depth + 1;
    this.element = element;
    this.parent = parent;
    this.children = [];
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
    if (this.isContainer) {
        this.parent_container = null;
        this.containers = [];
        this.findContainer();
    }
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
    if (!this.isContainer) {
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

/**
 * @this {Item}
 */
Item.prototype.remove = function () {
    "use strict";
    /**
     * Remove any references to removed items (container references)
     * @param {Item} item
     */
    function internal_remove(item) {
        var index;
        if (item.parent_container !== null) {
            index = item.parent_container.containers.indexOf(item);
            if (index !== -1) {
                item.parent_container.containers.splice(index, 1);
            }
        }
        for (index = 0; index < item.children.length; index += 1) {
            internal_remove(item.children[index]);
        }
    }
    this.element.parentElement.removeChild(this.element);
    var index = this.parent.children.indexOf(this);
    if (index !== -1) {
        this.parent.children.splice(index, 1);
    }
    internal_remove(this);
};