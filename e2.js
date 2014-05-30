/*jslint browser: true, devel: true */
/*global e2 */

var Item,
    Mouse,
    Root;

/**
 * @param {number} x
 * @param {number} y
 * @param {Item} container
 */
function clientPos(x, y, container) {
    "use strict";
    while (container !== Root) {
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
    while (container !== Root) {
        x += container.x;
        y += container.y;
        container = container.parent;
    }
    return { x: x, y: y };
}

/**
 * Sets position:relative on elements that are children of a non-container element
 * @param {Item} parent
 */
function nonContainer(item) {
    "use strict";
    function relativePosition(parent) {
        var i;
        for (i = 0; i < parent.children.length; i += 1) {
            parent.children[i].style.position = "relative";
            parent.children[i].e2_owner = item;
            relativePosition(parent.children[i]);
        }
    }
    item.element.contentEditable = true;
    relativePosition(item.element);
}

/**
 * Creates items beneath an element
 * @param {Item} parent
 */
function createItems(parent) {
    "use strict";
    if (!parent.isContainer) {
        nonContainer(parent);
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
    while (element && !element.e2_item) {
        element = element.parentElement;
    }
    if (!element) {
        return;
    }
    return element.e2_item;
}

/**
 * Finds the value of an inherited attribute
 * @param {Element} element
 * @param {String} attribute
 */
function getAttr(element, attribute) {
    "use strict";
    while (element.parentElement && element[attribute] === "inherit") {
        element = element.parentElement;
    }
    return element[attribute];
}

/**
 * @param {Event} e
 */
function prevent(e) {
    "use strict";
    e.preventDefault();
}

/**
 * @param {KeyboardEvent} e
 */
window.onkeyup = function (e) {
    "use strict";
    return true;
};

/**
 * @param {KeyboardEvent} e
 */
window.onkeydown = function (e) {
    "use strict";
    // start typing wherever the cursor is
    function positionCaret() {
        var caret,
            node = Mouse.hover;
        if (!node || getAttr(node, "contentEditable").toLowerCase() !== "true") {
            return false;
        }
        if (node.nodeType !== node.TEXT_NODE) {
            node = node.firstChild;
            if (!node || node.nodeType !== node.TEXT_NODE) {
                return false;
            }
        }
        if (document.caretPositionFromPoint) {
            caret = document.caretPositionFromPoint(Mouse.x, Mouse.y).offset;
        } else if (document.caretRangeFromPoint) {
            caret = document.caretRangeFromPoint(Mouse.x, Mouse.y).startOffset;
        } else {
            return false;
        }
        window.getSelection().collapse(node, caret);
        return true;
    }
    if (!Mouse.edit) {
        Mouse.edit = Mouse.hover;
        if (!positionCaret()) {
            console.log("TODO: create new text item in this case");
        }
    }
    return true;
};

/**
 * @param {KeyboardEvent} e
 */
window.onkeypress = function (e) {
    "use strict";
    return true;
};

window.Mouse = {
    /**
     * @type {Item}
     */
    carried: {
        item: null,
        startX: 0,
        startY: 0,
        originalZ: ""
    },
    click: {
        x: 0,
        y: 0,
        element: null
    },
    left: false,
    right: false,
    x: 0,
    y: 0,
    edit: null,
    hover: null,
    focus: null,
    update: function () {
        "use strict";
        if (Mouse.carried.item !== null) {
            Mouse.carried.item.move(Mouse.x - Mouse.carried.startX, Mouse.y - Mouse.carried.startY);
        }
    },
    /**
     * @param {Item} item
     */
    pickup: function (item) {
        "use strict";
        if (!item) {
            return;
        }
        Mouse.carried.item = item;
        Mouse.carried.startX = Mouse.x - item.x;
        Mouse.carried.startY = Mouse.y - item.y;
        Mouse.carried.originalZ = item.element.style.zIndex;
        item.element.style.zIndex = "9001";
        Mouse.update();
    },
    /**
     * @param {Item} item
     */
    clone: function (item) {
        "use strict";
        if (!item) {
            return;
        }
        Mouse.pickup(item.clone());
    },
    place: function () {
        "use strict";
        if (!Mouse.carried.item) {
            return;
        }
        Mouse.update();
        Mouse.carried.item.element.style.zIndex = Mouse.carried.originalZ;
        Mouse.carried.item.placeDown(Mouse.x, Mouse.y);
        Mouse.carried.item = null;
    },
    stamp: function () {
        "use strict";
        if (!Mouse.carried.item) {
            return;
        }
        var clone = Mouse.carried.item.clone();
        clone.element.style.zIndex = Mouse.carried.originalZ;
        clone.placeDown(Mouse.x, Mouse.y, Mouse.carried.item);
    },
    /**
     * @param {Element} target
     */
    remove: function (target) {
        "use strict";
        var item = Mouse.carried.item || getItem(target);
        if (!item) {
            return;
        }
        item.remove();
        Mouse.carried.item = null;
    },
    /**
     * @param {MouseEvent} e
     */
    down: function (e) {
        "use strict";
        if (!Mouse.left && !Mouse.right) {
            Mouse.click.x = Mouse.x;
            Mouse.click.y = Mouse.y;
            Mouse.click.element = e.target;
        }
        switch (e.button) {
        case 0:
            Mouse.left = true;
            break;
        case 2:
            Mouse.right = true;
            break;
        }
        var item = getItem(e.target);
        return !(!item || item.isContainer || e.target.textContent.length === 0);
    },
    /**
     * @param {MouseEvent} e
     */
    up: function (e) {
        "use strict";
        var selection = window.getSelection();
        if (e.target !== Mouse.click.element || Math.abs(e.clientX - Mouse.click.x) > 10 || Math.abs(e.clientY - Mouse.click.y) > 10 || selection.toString().length > 0) {
            console.log("Mouse moved too far, aborting action");
            // deselect selected text when we click
            if (!selection.containsNode(e.target, true) ||
                    selection.anchorNode.nodeName === "DIV" || selection.anchorNode.nodeName === "HTML" ||
                    selection.focusNode.nodeName === "DIV" || selection.focusNode.nodeName === "HTML" ||
                    e.target.nodeName === "DIV" || e.target.nodeName === "HTML") {
                selection.removeAllRanges();
            }
            Mouse.left = false;
            Mouse.right = false;
            return;
        }
        switch (e.button) {
        case 0:
            if (!Mouse.left) {
                break;
            }
            Mouse.left = false;
            if (Mouse.right) {
                Mouse.remove(e.target);
                Mouse.right = false;
            } else {
                if (Mouse.carried.item !== null) {
                    Mouse.place();
                } else {
                    Mouse.pickup(getItem(e.target));
                }
            }
            break;
        case 2:
            if (!Mouse.right) {
                break;
            }
            Mouse.right = false;
            if (Mouse.left) {
                Mouse.remove(e.target);
                Mouse.left = false;
            } else {
                if (Mouse.carried.item !== null) {
                    Mouse.stamp();
                } else {
                    Mouse.clone(getItem(e.target));
                }
            }
            break;
        }
    },
    /**
     * @param {MouseEvent} e
     */
    move: function (e) {
        "use strict";
        Mouse.x = e.clientX;
        Mouse.y = e.clientY;
        if (Mouse.hover !== e.target) {
            Mouse.hover = e.target;
            if (Mouse.hover) {
                // focus the hovered element
                if (Mouse.hover.e2_owner) {
                    if (!Mouse.focus) {
                        Mouse.focus = Mouse.hover.e2_owner.element;
                        Mouse.focus.focus();
                    } else if (Mouse.focus !== Mouse.hover.e2_owner.element) {
                        Mouse.focus.blur();
                        Mouse.focus = Mouse.hover.e2_owner.element;
                        Mouse.focus.focus();
                    }
                } else if (Mouse.hover.contentEditable) {
                    if (!Mouse.focus) {
                        Mouse.focus = Mouse.hover;
                        Mouse.focus.focus();
                    } else if (Mouse.focus !== Mouse.hover) {
                        Mouse.focus.blur();
                        Mouse.focus = Mouse.hover;
                        Mouse.focus.focus();
                    }
                }
                if (Mouse.edit && (!Mouse.hover.e2_owner || Mouse.hover.e2_owner !== Mouse.edit.e2_owner)) {
                    // if we move out of the element we're editing, defocus it
                    Mouse.edit.blur();
                    window.getSelection().collapse(document.body, 0);
                    Mouse.edit = null;
                }
            }
        }
        Mouse.update();
    }
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
    while (container.parent &&
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
 * @param {Item} exclude
 */
Item.prototype.placeDown = function (x, y, exclude) {
    "use strict";
    var new_parent,
        pos,
        index,
        also_this = this;
    /**
     * Searches the element structure and finds the highest level container
     * @param {number} x
     * @param {number} y
     * @param {Item} parent
     */
    function internal_find_container(x, y, parent) {
        var i,
            best = parent,
            next,
            cx,
            cy;
        for (i = 0; i < parent.containers.length; i += 1) {
            next = parent.containers[i];
            if (next !== also_this && next !== exclude) {
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
    new_parent = internal_find_container(x, y, Root);
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
        if (item.parent_container) {
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

window.onload = function () {
    "use strict";
    window.oncontextmenu = prevent;
    window.onmousedown = Mouse.down;
    window.onmouseup = Mouse.up;
    window.onmousemove = Mouse.move;
    window.Root = {
        isContainer: true,
        depth: 0,
        element: document.body,
        children: [],
        containers: []
    };
    document.body.e2_item = Root;
    createItems(Root);
};