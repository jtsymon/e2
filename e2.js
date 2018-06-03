/*jslint browser: true, devel: true */
/*global e2 */
"use strict";

// Finds the value of an inherited attribute
function getAttr(element, attribute) {
    while (element.parentElement && element[attribute] === "inherit") {
        element = element.parentElement;
    }
    return element[attribute];
}

function prevent(e) {
    e.preventDefault();
}

function returnTrue(e) {
    return true;
}

class CarriedItem {
    constructor(context, item) {
        this.context = context;
        this.item = item;
        this.startX = context.x - item.x;
        this.startY = context.y - item.y;
        this.startZ = item.element.style.zIndex;
        item.element.style.zIndex = "1000000";
    }
    
    update() {
        this.item.move(this.context.x - this.startX, this.context.y - this.startY);
    }
    
    place() {
        this.item.element.style.zIndex = this.startZ;
        this.item.placeDown(this.context.x, this.context.y);
        this.context.carried = null;
    }
    
    stamp() {
        var clone = this.item.clone();
        clone.element.style.zIndex = this.startZ;
        clone.placeDown(this.context.x, this.context.y, this.item);
    }
}

class Expeditee {
    constructor(root) {
        this.click = {
            x: 0,
            y: 0,
            element: null
        };
        this.left = false;
        this.right = false;
        this.x = 0;
        this.y = 0;
        this.carried = null;
        this.edit = null;
        this.hover = null;
        this.focus = null;
        
        this.root = new Item(this, root);
        root.oncontextmenu = prevent;
        root.onmousedown = this.mouseDown.bind(this);
        root.onmouseup = this.mouseUp.bind(this);
        root.onmousemove = this.mouseMove.bind(this);
        root.onkeyup = returnTrue;
        root.onkeypress = returnTrue;
        root.onkeydown = this.keyDown.bind(this);
        root.ondragover = prevent;
        root.ondrop = this.tryDrop.bind(this);
    }
    
    leftClick(e) {
        if (this.carried) {
            this.carried.update();
            this.carried.place();
        } else {
            var item = Item.find(e.target);
            if (item && item != this.root) {
                this.carried = new CarriedItem(this, item);
            }
        }
    }
    
    rightClick(e) {
        if (this.carried) {
            this.carried.update();
            this.carried.stamp();
        } else if (e.altKey) {
            // create a container under the mouse
            // (currently haven't implemented resizing)
            var parent = Item.container(e.target) || this.root;
            var element = document.createElement('DIV');
            element.style.width = "100px";
            element.style.height = "100px";
            element.style.backgroundColor = "rgb(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ")";
            parent.element.appendChild(element);
            var item = new Item(this, element, parent);
            var pos = item.clientPos(this.x - item.width / 2, this.y - item.height / 2);
            item.move(pos.x, pos.y);
            this.hover = element;
        } else {
            var item = Item.find(e.target);
            if (item && item != this.root) {
                this.carried = new CarriedItem(this, item.clone());
            }
        }
    }
    
    leftRightClick(e) {
        if (this.carried) {
            this.carried.item.remove();
            this.carried = null;
        } else {
            var item = Item.find(e.target);
            if (item && item != this.root) {
                item.remove();
            }
        }
    }
    
    mouseDown(e) {
        this.x = e.clientX;
        this.y = e.clientY;
        if (!this.left && !this.right) {
            this.click.x = this.x;
            this.click.y = this.y;
            this.click.element = e.target;
        }
        switch (e.button) {
        case 0:
            this.left = true;
            break;
        case 2:
            this.right = true;
            break;
        }
        var item = Item.find(e.target);
        return !(!item || item.isContainer || e.target.textContent.length === 0);
    }
    
    mouseUp(e) {
        this.x = e.clientX;
        this.y = e.clientY;
        var selection = window.getSelection(),
            parent,
            element,
            item,
            pos;
        if (e.target !== this.click.element || Math.abs(e.clientX - this.click.x) > 10 || Math.abs(e.clientY - this.click.y) > 10 || selection.toString().length > 0) {
            console.log("Mouse moved too far, aborting action");
            // deselect selected text when we click
            if (!selection.containsNode(e.target, true) ||
                    selection.anchorNode.nodeName === "DIV" || selection.anchorNode.nodeName === "HTML" ||
                    selection.focusNode.nodeName === "DIV" || selection.focusNode.nodeName === "HTML" ||
                    e.target.nodeName === "DIV" || e.target.nodeName === "HTML") {
                selection.removeAllRanges();
            }
            this.left = false;
            this.right = false;
            return;
        }
        console.log(e.button);
        switch (e.button) {
        case 0:
            if (!this.left) {
                break;
            }
            this.left = false;
            if (this.right) {
                this.right = false;
                this.leftRightClick(e);
            } else {
                this.leftClick(e);
            }
            break;
        case 2:
            if (!this.right) {
                break;
            }
            this.right = false;
            console.log("RIGHT");
            if (this.left) {
                this.left = false;
                this.leftRightClick(e);
            } else {
                this.rightClick(e);
            }
            break;
        }
    }
    
    mouseMove(e) {
        this.x = e.clientX;
        this.y = e.clientY;
        if (this.hover !== e.target) {
            this.hover = e.target;
            if (this.hover) {
                // focus the hovered element
                if (this.hover.e2_owner) {
                    if (!this.focus) {
                        this.focus = this.hover.e2_owner.element;
                        this.focus.focus();
                    } else if (this.focus !== this.hover.e2_owner.element) {
                        this.focus.blur();
                        this.focus = this.hover.e2_owner.element;
                        this.focus.focus();
                    }
                } else if (this.hover.contentEditable) {
                    if (!this.focus) {
                        this.focus = this.hover;
                        this.focus.focus();
                    } else if (this.focus !== this.hover) {
                        this.focus.blur();
                        this.focus = this.hover;
                        this.focus.focus();
                    }
                }
                if (this.edit && (!this.hover.e2_owner || this.hover.e2_owner !== this.edit.e2_owner)) {
                    // if we move out of the element we're editing, defocus it
                    if (this.edit.textContent.trim().length <= 0) {
                        if (this.edit.e2_item) {
                            this.edit.e2_item.remove();
                        } else {
                            this.edit.parentElement.removeChild(this.edit);
                        }
                    }
                    this.edit.blur();
                    var sel = window.getSelection();
                    if (sel.anchorNode) {
                        sel.collapse(sel.anchorNode, 0);
                    }
                    this.edit = null;
                }
            }
        }
        if (this.carried) {
            this.carried.update();
        }
    }
    
    positionCaret() {
        var caret,
            node = this.hover;
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
            caret = document.caretPositionFromPoint(this.x, this.y).offset;
        } else if (document.caretRangeFromPoint) {
            caret = document.caretRangeFromPoint(this.x, this.y).startOffset;
        } else {
            return false;
        }
        window.getSelection().collapse(node, caret);
        return true;
    }
    
    keyDown(e) {
        // start typing wherever the cursor is
        if (!this.edit) {
            this.edit = this.hover;
            if (!this.positionCaret()) {
                // create a text element under the cursor
                var parent = Item.find(e.target) || this.root,
                    element = document.createElement('P'),
                    item,
                    pos;
                element.contentEditable = "true";
                parent.element.appendChild(element);
                item = new Item(this, element, parent);
                pos = item.clientPos(this.x - item.width / 2, this.y - item.height / 2);
                item.move(pos.x, pos.y);
                element.focus();
                this.hover = element;
                this.focus = element;
                this.edit = element;
            }
        }
        return true;
    }

    dropElements(e, source) {
        var parent = Item.find(e.target) || this.root,
            temp = document.createElement('DIV'),
            retry = 100;
        temp.innerHTML = source;
        for (var i = 0; i < temp.children.length; i++) {
            var element = temp.children[i],
                retry = 3;
            parent.element.appendChild(element);
            var item = new Item(this, element, parent);
            item.move(e.x, e.y);
        }
    }

    tryDrop(e) {
        e.preventDefault();
        for (var i = 0; i < e.dataTransfer.items.length; i++) {
            var data = e.dataTransfer.items[i];
            if (data.kind == "string" && data.type == "text/html")
            {
                data.getAsString(source => this.dropElements(e, source));
                break;
            }
        }
    }
}

class Item {
    constructor(context, element, parent) {
        this.element = element;
        this.context = context;
        this.children = [];
        if (parent === undefined) {
            this.isContainer = true;
            this.parent_container = null;
            this.containers = [];
            this.depth = 0;
            this.parent = null;
        } else {
            this.isContainer = (element.nodeName === "DIV");
            this.depth = parent.depth + 1;
            this.parent = parent;
            parent.children.push(this);
            if (this.isContainer) {
                this.parent_container = null;
                this.containers = [];
                this.findContainer();
            }
        }
        if (element.style.left === "") {
            element.style.left = "0px";
        }
        if (element.style.top === "") {
            element.style.top = "0px";
        }
        var rect = element.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        rect = this.clientPos(rect.left, rect.top);
        this.x = rect.x;
        this.y = rect.y;
        element.e2_item = this;
        element.style.position = "absolute";
        this.createItems();
    }
    
    move(x, y) {
        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
        this.x = x;
        this.y = y;
    }
    
    findContainer() {
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
    }
    
    placeDown(x, y, exclude) {
        var new_parent,
            pos,
            index,
            also_this = this;
        // Searches the element structure and finds the highest level container
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
        new_parent = internal_find_container(x, y, this.context.root);
        if (new_parent !== this.parent) {
            // find the correct position
            pos = this.absPos(this.x, this.y);
            pos = this.clientPos(pos.x, pos.y, new_parent);
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
    }
    
    clone() {
        var element = this.element.cloneNode(true);
        this.parent.element.appendChild(element);
        return new Item(this.context, element, this.parent);
    }
    
    remove() {
        // Remove any references to removed items (container references)
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
    }

    clientPos(x, y, container = this.parent) {
        while (container) {
            x -= container.x;
            y -= container.y;
            container = container.parent;
        }
        return { x: x, y: y };
    }

    absPos(x, y, container = this.parent) {
        while (container) {
            x += container.x;
            y += container.y;
            container = container.parent;
        }
        return { x: x, y: y };
    }

    // Sets position:relative on elements that are children of a non-container element
    relativePosition(element = this.element) {
        for (var i = 0; i < element.children.length; i++) {
            element.children[i].style.position = "relative";
            element.children[i].e2_owner = this;
            this.relativePosition(element.children[i]);
        }
    }
    
    // Creates child items beneath an item
    createItems() {
        if (this.isContainer) {
            for (var i = 0; i < this.element.children.length; i++) {
                if (!this.element.children[i].e2_item) {
                    new Item(this.context, this.element.children[i], this);
                }
            }
        } else {
            this.element.contentEditable = true;
            this.relativePosition();
        }
    }

    // Gets the parent item for an element that is a child of a non-container element
    static find(element) {
        while (element && !element.e2_item) {
            element = element.parentElement;
        }
        if (!element) {
            return null;
        }
        return element.e2_item;
    }
    
    // Gets the first ancestor container item
    static container(element) {
        while (element && !element.e2_item) {
            element = element.parentElement;
        }
        if (!element || !element.e2_item) {
            return null;
        }
        var item = element.e2_item;
        while (item && !item.isContainer) {
            item = item.parent;
        }
        return item;
    }
}

window.onload = function() {
    window.Expeditee = new Expeditee(document.body);
};
