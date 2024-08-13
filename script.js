"use strict";
function copy(aObject) {
    // Prevent undefined objects
    // if (!aObject) return aObject;
    var bObject = Array.isArray(aObject)
        ? []
        : {};
    var value, key;
    for (key in aObject) {
        // Prevent self-references to parent object
        // if (Object.is(aObject[key], aObject)) continue;
        value = aObject[key];
        bObject[key] = typeof value === "object" ? copy(value) : value;
    }
    return bObject;
}
var Effect = /** @class */ (function () {
    function Effect(inName, inModifiers, inDuration, inAppliedOn, inAppliedTo, inImpact, inApplyUnique) {
        if (inApplyUnique === void 0) { inApplyUnique = true; }
        this.name = inName;
        this.modifiers = Object.fromEntries(inModifiers);
        this.durationLeft = this.baseDuration = inDuration;
        this.applyUnique = inApplyUnique;
        this.appliedOn = inAppliedOn;
        this.appliedTo = inAppliedTo;
        this.impact = inImpact;
        this.type = "effect";
    }
    return Effect;
}());
var Item = /** @class */ (function () {
    function Item(name, values) {
        //slot - string representing slot name
        this.slot = "artifact";
        this.effects = [];
        this.modifiers = {};
        if (values !== undefined) {
            //el in format ["slot/stat", "equipmentPart"/statObj]
            //Sanitized beforehand
            for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
                var _a = values_1[_i], name_1 = _a[0], value = _a[1];
                //Slot and effects are strings, everything else must be a number
                //Until buffs and debuffs will be extended to items
                if (name_1 === "slot") {
                    this.slot = String(value);
                    continue;
                }
                if (name_1 === "effect") {
                    this.effects.push(String(value));
                    continue;
                }
                //It's not slot name nor effect, so it's a stat modifier
                this.modifiers[name_1] = Number(value);
            }
        }
        this.name = name;
        //Since you can't save object type to JSON, this has to do (just in case)
        this.type = "item";
    }
    return Item;
}());
var Stat = /** @class */ (function () {
    function Stat(name, level) {
        if (!isInStats(name)) {
            state.stats.push(name);
        }
        this.level = level !== null && level !== void 0 ? level : state.startingLevel;
        if (levellingToOblivion) {
            this.experience = 0;
            this.expToNextLvl = 2 * this.level;
        }
        this.type = "stat";
    }
    Stat.prototype.toString = function () {
        return levellingToOblivion || !(this.expToNextLvl && this.experience)
            ? String(this.level)
            : "level = ".concat(this.level, " exp = ").concat(this.experience, " exp to lvl up=").concat(this.expToNextLvl, "(").concat(this.expToNextLvl - this.experience, ")");
    };
    return Stat;
}());
var Character = /** @class */ (function () {
    function Character() {
        //Type declarations
        this.hp = 100;
        this.level = 1;
        this.experience = 0;
        this.expToNextLvl = 2;
        this.skillpoints = 0;
        this.items = {};
        this.type = "character";
        this.isNpc = false;
        this.stats = {};
        // Marked as possibly undefined for backwards compatibility
        this.activeEffects = [];
    }
    return Character;
}());
var isInStats = function (name) {
    return state.stats.indexOf(name) > -1;
};
var state = {
    stats: [],
    dice: 20,
    startingLevel: 1,
    startingHP: 100,
    runEffectsOutsideBattle: false,
    characters: {},
    punishment: 5,
    skillpointsOnLevelUp: 5,
    items: {},
    effects: {},
    seenOutput: false,
    inventory: [],
    in: "",
    ctxt: "",
    out: "\nState was set correctly. State created with AID State Creator.",
    message: "",
    inBattle: false,
};
var defaultState = copy(state);
var levellingToOblivion = true;
var stateKeys = Object.keys(state);
var RecursiveTypeCheck = function (originalObject, comparedObject, comparedObjectName) {
    if (typeof comparedObject !== typeof originalObject)
        return [
            "".concat(comparedObjectName, " is of incorrect type (").concat(typeof comparedObject, " instead of ").concat(typeof originalObject, ")"),
        ];
    if (typeof comparedObject !== "object")
        return true;
    var errors = [];
    for (var key in comparedObject) {
        var temp = RecursiveTypeCheck(originalObject[key], comparedObject[key], "".concat(comparedObjectName, ": ").concat(key));
        if (typeof temp !== "boolean")
            errors.concat(temp);
    }
    return errors.length > 0 ? errors : true;
};
var ParseState = function (state_text) {
    var tempState = {};
    var errors = [];
    try {
        tempState = JSON.parse(state_text.replace("\n", ""));
    }
    catch (SyntaxError) {
        errors.push("JSON state invalid");
        return;
    }
    var checkOutput = RecursiveTypeCheck(state, tempState, "state");
    if (typeof checkOutput !== "boolean")
        errors.concat(checkOutput);
    if (errors.length === 0) {
        for (var key in tempState) {
            if (Object.prototype.hasOwnProperty.call(tempState, key)) {
                state[key] = tempState[key];
            }
        }
        UpdateFields();
    }
    else
        return errors;
};
var UpdateFields = function () {
    document.getElementById("dice").value = String(state.dice);
    document.getElementById("startingLevel").value =
        String(state.startingLevel);
    document.getElementById("startingHP").value = String(state.startingHP);
    document.getElementById("skillpointsOnLevelUp").value = String(state.skillpointsOnLevelUp);
    document.getElementById("punishment").value = String(state.punishment);
    document.getElementById("inBattle").checked =
        state.inBattle;
    document.getElementById("in").value = String(state.in);
    document.getElementById("ctxt").value = String(state.ctxt);
    document.getElementById("out").value = String(state.out);
    if (state.stats.length == 0)
        document.getElementById("stats").innerHTML = "";
    if (state.inventory.length == 0)
        document.getElementById("inventory").innerHTML = "";
    if (!state.side1 || state.side1.length == 0)
        document.getElementById("side1").innerHTML = "";
    if (!state.side2 || state.side2.length == 0)
        document.getElementById("side2").innerHTML = "";
    if (!state.active || state.active.length == 0)
        document.getElementById("active").innerHTML = "";
    if (!state.characters || Object.keys(state.characters).length == 0)
        document.getElementById("characters").innerHTML =
            "";
    if (!state.items || Object.keys(state.items).length == 0)
        document.getElementById("items").innerHTML = "";
    if (!state.effects || Object.keys(state.effects).length == 0)
        document.getElementById("effects").innerHTML = "";
};
var main = function () {
    var error_place = document.getElementById("errors");
    var state_text = document.getElementById("state_text");
    if (!state_text)
        error_place.innerHTML = "State text could not be retrieved.";
    state_text.onkeydown = function (key) {
        if (key.code === "Enter" && key.ctrlKey)
            document.getElementById("serialize").click();
    };
    document.getElementById("new_stat").onkeydown = function (event) {
        if (event.key === "Enter")
            document.getElementById("add_stat").click();
    };
    document.getElementById("add_stat").onclick = function () {
        var statsDiv = document.getElementById("stats");
        var index = state.stats.length;
        var newStat = document.getElementById("new_stat").value.trim();
        document.getElementById("new_stat").value = "";
        state.stats.push(newStat);
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        newDiv.id = "stat_".concat(index);
        var inputElement = document.createElement("input");
        inputElement.value = state.stats[index];
        inputElement.onchange = function () {
            state.stats[index] = inputElement.value;
        };
        newDiv.appendChild(inputElement);
        for (var _i = 0, _a = Array.from(document.getElementsByClassName("stat-select")); _i < _a.length; _i++) {
            var element = _a[_i];
            var select = element;
            var option = document.createElement("option");
            option.text = option.value = newStat;
            select.appendChild(option);
        }
        var deleteStat = document.createElement("button");
        deleteStat.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteStat.onclick = function () {
            var _a;
            for (var _i = 0, _b = Array.from(document.getElementsByClassName("stat-select")); _i < _b.length; _i++) {
                var element = _b[_i];
                var select = element;
                for (var _c = 0, _d = Array.from(select.options); _c < _d.length; _c++) {
                    var option = _d[_c];
                    if (option.value === newStat) {
                        select.removeChild(option);
                        break;
                    }
                }
            }
            (_a = document.getElementById("stat_".concat(index))) === null || _a === void 0 ? void 0 : _a.remove();
            state.stats.splice(index, 1);
        };
        newDiv.appendChild(deleteStat);
        statsDiv.appendChild(newDiv);
    };
    document.getElementById("new_slot").onkeydown = function (event) {
        if (event.key === "Enter")
            document.getElementById("add_slot").click();
    };
    var slots = [];
    document.getElementById("add_slot").onclick = function () {
        var slotsDiv = document.getElementById("slots");
        var index = slots.length;
        var newSlot = document.getElementById("new_slot").value.trim();
        document.getElementById("new_slot").value = "";
        slots.push(newSlot);
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        newDiv.id = "slot_".concat(index);
        var inputElement = document.createElement("input");
        inputElement.value = slots[index];
        inputElement.onchange = function () {
            slots[index] = inputElement.value;
        };
        newDiv.appendChild(inputElement);
        for (var _i = 0, _a = Array.from(document.getElementsByClassName("slot-select")); _i < _a.length; _i++) {
            var element = _a[_i];
            var select = element;
            var option = document.createElement("option");
            option.value = option.text = newSlot;
            select.appendChild(option);
        }
        for (var _b = 0, _c = Array.from(document.getElementsByClassName("equipment-list")); _b < _c.length; _b++) {
            var element = _c[_b];
            var equipment = element;
            var slotElement = document.createElement("li");
            var slotName = document.createElement("p");
            slotName.innerText = newSlot;
            slotElement.appendChild(slotName);
            var equippedItem = document.createElement("select");
            equippedItem.className = "item-".concat(newSlot, "-select item-slot-select");
            for (var _d = 0, _e = itemsBySlot[newSlot]; _d < _e.length; _d++) {
                var itemName = _e[_d];
                var option = document.createElement("option");
                option.text = option.value = itemName;
                equippedItem.appendChild(option);
            }
            slotElement.appendChild(equippedItem);
            equipment.appendChild(slotElement);
        }
        var deleteSlot = document.createElement("button");
        deleteSlot.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteSlot.onclick = function () {
            var _a;
            for (var _i = 0, _b = Array.from(document.getElementsByClassName("slot-select")); _i < _b.length; _i++) {
                var element = _b[_i];
                var select = element;
                for (var _c = 0, _d = Array.from(select.options); _c < _d.length; _c++) {
                    var option = _d[_c];
                    if (option.value === newSlot) {
                        select.removeChild(option);
                        break;
                    }
                }
            }
            for (var _e = 0, _f = Array.from(document.getElementsByClassName("item-".concat(newSlot, "-select"))); _e < _f.length; _e++) {
                var element = _f[_e];
                (_a = element.parentElement) === null || _a === void 0 ? void 0 : _a.remove();
            }
            newDiv.remove();
            slots.splice(index, 1);
        };
        newDiv.appendChild(deleteSlot);
        slotsDiv.appendChild(newDiv);
    };
    document.getElementById("add_item_inventory").onclick = function () {
        if (Object.keys(state.items).length === 0) {
            alert("Error: There are no items");
            return;
        }
        var inventoryDiv = document.getElementById("inventory");
        var index = inventoryDiv.childElementCount;
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var newSelect = document.createElement("select");
        newSelect.className = "item-select";
        newSelect.id = "inventory_item_".concat(index);
        // const optionA = document.createElement("option");
        // optionA.value = optionA.innerText = "A";
        // const optionB = document.createElement("option");
        // optionB.value = optionB.innerText = "B";
        // newSelect.appendChild(optionA);
        // newSelect.appendChild(optionB);
        for (var itemName in state.items) {
            var option = document.createElement("option");
            option.value = option.innerText = itemName;
            newSelect.appendChild(option);
        }
        state.inventory[index] = newSelect.firstChild.value;
        newDiv.appendChild(newSelect);
        var deleteItem = document.createElement("button");
        deleteItem.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteItem.onclick = function () {
            var _a;
            (_a = document.getElementById("inventory_item_".concat(index))) === null || _a === void 0 ? void 0 : _a.remove();
            state.inventory.splice(index, 1);
        };
        newDiv.appendChild(deleteItem);
        inventoryDiv.appendChild(newDiv);
        newSelect.onchange = function () {
            state.inventory[index] = newSelect.value;
        };
    };
    document.getElementById("add_character_side1").onclick = function () {
        var _a;
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }
        (_a = state.side1) !== null && _a !== void 0 ? _a : (state.side1 = []);
        state.inBattle = true;
        var side1Div = document.getElementById("side1");
        var index = side1Div.childElementCount;
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var newSelect = document.createElement("select");
        newSelect.id = "side1_character_".concat(index);
        // const optionA = document.createElement("option");
        // optionA.value = optionA.innerText = "A";
        // const optionB = document.createElement("option");
        // optionB.value = optionB.innerText = "B";
        // newSelect.appendChild(optionA);
        // newSelect.appendChild(optionB);
        for (var characterName in state.characters) {
            var option = document.createElement("option");
            option.value = option.innerText = characterName;
            newSelect.appendChild(option);
        }
        state.side1[index] = newSelect.firstChild.value;
        newDiv.appendChild(newSelect);
        var deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteCharacter.onclick = function () {
            var _a, _b;
            (_a = document.getElementById("side1_character_".concat(index))) === null || _a === void 0 ? void 0 : _a.remove();
            (_b = state.side1) === null || _b === void 0 ? void 0 : _b.splice(index, 1);
        };
        newDiv.appendChild(deleteCharacter);
        side1Div.appendChild(newDiv);
        newSelect.onchange = function () {
            var _a;
            (_a = state.side1) !== null && _a !== void 0 ? _a : (state.side1 = []);
            state.side1[index] = newSelect.value;
        };
    };
    document.getElementById("add_character_side2").onclick = function () {
        var _a;
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }
        (_a = state.side2) !== null && _a !== void 0 ? _a : (state.side2 = []);
        state.inBattle = true;
        var side2Div = document.getElementById("side2");
        var index = side2Div.childElementCount;
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var newSelect = document.createElement("select");
        newSelect.id = "side2_character_".concat(index);
        // const optionA = document.createElement("option");
        // optionA.value = optionA.innerText = "A";
        // const optionB = document.createElement("option");
        // optionB.value = optionB.innerText = "B";
        // newSelect.appendChild(optionA);
        // newSelect.appendChild(optionB);
        for (var characterName in state.characters) {
            var option = document.createElement("option");
            option.value = option.innerText = characterName;
            newSelect.appendChild(option);
        }
        state.side2[index] = newSelect.firstChild.value;
        newDiv.appendChild(newSelect);
        var deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteCharacter.onclick = function () {
            var _a, _b;
            (_a = document.getElementById("side2_character_".concat(index))) === null || _a === void 0 ? void 0 : _a.remove();
            (_b = state.side2) === null || _b === void 0 ? void 0 : _b.splice(index, 1);
        };
        newDiv.appendChild(deleteCharacter);
        side2Div.appendChild(newDiv);
        newSelect.onchange = function () {
            var _a;
            (_a = state.side2) !== null && _a !== void 0 ? _a : (state.side2 = []);
            state.side2[index] = newSelect.value;
        };
    };
    document.getElementById("add_character_active").onclick = function () {
        var _a;
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }
        (_a = state.active) !== null && _a !== void 0 ? _a : (state.active = []);
        state.inBattle = true;
        var activeDiv = document.getElementById("active");
        var index = activeDiv.childElementCount;
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var newSelect = document.createElement("select");
        newSelect.id = "active_character_".concat(index);
        // const optionA = document.createElement("option");
        // optionA.value = optionA.innerText = "A";
        // const optionB = document.createElement("option");
        // optionB.value = optionB.innerText = "B";
        // newSelect.appendChild(optionA);
        // newSelect.appendChild(optionB);
        for (var characterName in state.characters) {
            var option = document.createElement("option");
            option.value = option.innerText = characterName;
            newSelect.appendChild(option);
        }
        state.active[index] = newSelect.firstChild.value;
        newDiv.appendChild(newSelect);
        var deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteCharacter.onclick = function () {
            var _a, _b;
            (_a = document.getElementById("active_character_".concat(index))) === null || _a === void 0 ? void 0 : _a.remove();
            (_b = state.side1) === null || _b === void 0 ? void 0 : _b.splice(index, 1);
        };
        newDiv.appendChild(deleteCharacter);
        activeDiv.appendChild(newDiv);
        newSelect.onchange = function () {
            var _a;
            (_a = state.active) !== null && _a !== void 0 ? _a : (state.active = []);
            state.active[index] = newSelect.value;
        };
    };
    var itemsBySlot;
    document.getElementById("new_character").onkeydown = function (event) {
        if (event.key === "Enter")
            document.getElementById("add_character").click();
    };
    document.getElementById("add_character").onclick =
        function () {
            var charactersDiv = document.getElementById("characters");
            var newCharacterName = document.getElementById("new_character").value;
            document.getElementById("new_character").value = "";
            state.characters[newCharacterName] = new Character();
            var newCharacter = document.createElement("div");
            newCharacter.className = "character";
            var characterSheet = document.createElement("ul");
            characterSheet.className = "character-sheet";
            var nameElement = document.createElement("li");
            var nameParagraph = document.createElement("p");
            nameParagraph.innerText = newCharacterName;
            nameElement.appendChild(nameParagraph);
            characterSheet.appendChild(nameElement);
            var levelElement = document.createElement("li");
            var levelParagraph = document.createElement("p");
            levelParagraph.innerText = "Level: ";
            var levelInput = document.createElement("input");
            levelInput.type = "number";
            levelInput.value = String(state.characters[newCharacterName].level);
            levelInput.onchange = function () {
                state.characters[newCharacterName].level =
                    levelInput.valueAsNumber;
            };
            levelElement.appendChild(levelParagraph);
            levelElement.appendChild(levelInput);
            characterSheet.appendChild(levelElement);
            var experienceElement = document.createElement("li");
            var experienceParagraph = document.createElement("p");
            experienceParagraph.innerText = "Experience: ";
            var experienceInput = document.createElement("input");
            experienceInput.type = "number";
            experienceInput.value = String(state.characters[newCharacterName].experience);
            experienceInput.onchange = function () {
                state.characters[newCharacterName].experience =
                    experienceInput.valueAsNumber;
            };
            experienceElement.appendChild(experienceParagraph);
            experienceElement.appendChild(experienceInput);
            characterSheet.appendChild(experienceElement);
            var expToNextLvlElement = document.createElement("li");
            var expToNextLvlParagraph = document.createElement("p");
            expToNextLvlParagraph.innerText = "Experience to next level: ";
            var expToNextLvlInput = document.createElement("input");
            expToNextLvlInput.type = "number";
            expToNextLvlInput.value = String(state.characters[newCharacterName].expToNextLvl);
            expToNextLvlInput.onchange = function () {
                state.characters[newCharacterName].expToNextLvl =
                    expToNextLvlInput.valueAsNumber;
            };
            expToNextLvlElement.appendChild(expToNextLvlParagraph);
            expToNextLvlElement.appendChild(expToNextLvlInput);
            characterSheet.appendChild(expToNextLvlElement);
            var skillpointsElement = document.createElement("li");
            var skillpointsParagraph = document.createElement("p");
            skillpointsParagraph.innerText = "Skillpoints: ";
            var skillpointsInput = document.createElement("input");
            skillpointsInput.type = "number";
            skillpointsInput.value = String(state.characters[newCharacterName].skillpoints);
            skillpointsInput.onchange = function () {
                state.characters[newCharacterName].skillpoints =
                    skillpointsInput.valueAsNumber;
            };
            skillpointsElement.appendChild(skillpointsParagraph);
            skillpointsElement.appendChild(skillpointsInput);
            characterSheet.appendChild(skillpointsElement);
            var modifiersParagraph = document.createElement("p");
            modifiersParagraph.innerText = "Stats:";
            characterSheet.appendChild(modifiersParagraph);
            var modifierRefCount = {};
            var modifiersElement = document.createElement("ul");
            modifiersElement.style.listStyleType = "none";
            var modifierAddElement = document.createElement("li");
            var modifierAdd = document.createElement("button");
            modifierAdd.innerText = "Add modifier";
            modifierAdd.onclick = function () {
                var newModifier = document.createElement("li");
                newModifier.className = "single_value";
                var modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                var selected = false;
                var i = 0;
                for (var _i = 0, _a = state.stats; _i < _a.length; _i++) {
                    var stat = _a[_i];
                    var statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (!Object.keys(state.characters[newCharacterName].stats).includes(stat) &&
                        !selected) {
                        selected = true;
                        modifiedStat.selectedIndex = i;
                        if (!state.characters[newCharacterName].stats[stat])
                            state.characters[newCharacterName].stats[stat] =
                                new Stat(stat, 0);
                        modifierRefCount[stat] = isNaN(modifierRefCount[stat])
                            ? 1
                            : modifierRefCount[stat] + 1;
                    }
                    ++i;
                }
                if (!selected) {
                    alert("All of the created stats have been used for this character, create a new stat or modify already existing modifier");
                    modifiedStat.remove();
                    newModifier.remove();
                    return;
                }
                var previousStatName;
                modifiedStat.onfocus = function () {
                    previousStatName = modifiedStat.value;
                };
                modifiedStat.onchange = function () {
                    if (state.characters[newCharacterName].stats[modifiedStat.value]) {
                        state.characters[newCharacterName].stats[modifiedStat.value].level += modifiedValue.valueAsNumber;
                    }
                    else {
                        state.characters[newCharacterName].stats[modifiedStat.value] = new Stat(modifiedStat.value, modifiedValue.valueAsNumber);
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (state.characters[newCharacterName].stats[previousStatName]) {
                        state.characters[newCharacterName].stats[previousStatName].level -= modifiedValue.valueAsNumber;
                    }
                    else {
                        state.characters[newCharacterName].stats[previousStatName] = new Stat(previousStatName, 0);
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.characters[newCharacterName].stats[previousStatName];
                    }
                    previousStatName = modifiedStat.value;
                };
                newModifier.appendChild(modifiedStat);
                var modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                var previousValue;
                modifiedValue.onfocus = function () {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = function () {
                    if (isNaN(modifiedValue.valueAsNumber))
                        return;
                    if (!state.characters[newCharacterName].stats[modifiedStat.value]) {
                        state.characters[newCharacterName].stats[modifiedStat.value] = new Stat(modifiedStat.value, modifiedValue.valueAsNumber);
                    }
                    else {
                        state.characters[newCharacterName].stats[modifiedStat.value].level += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
                deleteModifier.onclick = function () {
                    state.characters[newCharacterName].stats[modifiedStat.value].level -= modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            characterSheet.appendChild(modifiersElement);
            var equipmentElement = document.createElement("li");
            var equipmentParagraph = document.createElement("p");
            equipmentParagraph.innerText = "Equipment:";
            equipmentElement.appendChild(equipmentParagraph);
            var equipment = document.createElement("ul");
            equipment.className = "equipment-list";
            for (var _i = 0, slots_1 = slots; _i < slots_1.length; _i++) {
                var slot = slots_1[_i];
                var slotElement = document.createElement("li");
                var slotName = document.createElement("p");
                slotName.innerText = slot;
                slotElement.appendChild(slotName);
                var equippedItem = document.createElement("select");
                equippedItem.className = "item-".concat(slot, "-select item-slot-select");
                for (var _a = 0, _b = itemsBySlot[slot]; _a < _b.length; _a++) {
                    var itemName = _b[_a];
                    var option = document.createElement("option");
                    option.text = option.value = itemName;
                    equippedItem.appendChild(option);
                }
                slotElement.appendChild(equippedItem);
                equipment.appendChild(slotElement);
            }
            equipmentElement.appendChild(equipment);
            characterSheet.appendChild(equipmentElement);
            var effectsElement = document.createElement("li");
            var effectsParagraph = document.createElement("p");
            effectsParagraph.innerText = "Effects:";
            effectsElement.appendChild(effectsParagraph);
            var effects = document.createElement("div");
            effects.className = "list";
            effectsElement.appendChild(effects);
            var effectAddInput = document.createElement("select");
            effectAddInput.className = "effect-select";
            for (var effectName in state.effects) {
                var option = document.createElement("option");
                option.value = option.innerText = effectName;
                effectAddInput.appendChild(option);
            }
            var effectAddButton = document.createElement("button");
            effectAddButton.innerText = "+";
            effectAddButton.onclick = function () {
                var _a, _b, _c;
                if (!state.characters[newCharacterName].activeEffects) {
                    state.characters[newCharacterName].activeEffects = [];
                }
                var selectedOption = effectAddInput.selectedOptions[0];
                var effectIndex = (_b = (_a = state.characters[newCharacterName].activeEffects) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
                (_c = state.characters[newCharacterName].activeEffects) === null || _c === void 0 ? void 0 : _c.push(state.effects[selectedOption.value]);
                var newElement = document.createElement("div");
                var newEffect = document.createElement("p");
                newEffect.innerText = selectedOption.value;
                newElement.appendChild(newEffect);
                var deleteElement = document.createElement("button");
                deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteElement.onclick = function () {
                    var _a;
                    if (!state.characters[newCharacterName].activeEffects) {
                        console.error("Effects disappeared?!");
                        return;
                    }
                    (_a = state.characters[newCharacterName].activeEffects) === null || _a === void 0 ? void 0 : _a.splice(effectIndex, 1);
                    effectAddInput.appendChild(selectedOption);
                    newElement.remove();
                };
                newElement.appendChild(deleteElement);
                effects.appendChild(newElement);
                effectAddInput.removeChild(selectedOption);
            };
            effectsElement.appendChild(effectAddInput);
            effectsElement.appendChild(effectAddButton);
            characterSheet.appendChild(effectsElement);
            newCharacter.appendChild(characterSheet);
            charactersDiv.appendChild(newCharacter);
        };
    document.getElementById("new_item").onkeydown = function (event) {
        if (event.key === "Enter")
            document.getElementById("add_item").click();
    };
    document.getElementById("add_item").onclick = function () {
        if (slots.length === 0) {
            document.getElementById("errors").innerText = "Create a slot for the items.";
            return;
        }
        var itemsDiv = document.getElementById("items");
        var newItemName = document.getElementById("new_item").value;
        document.getElementById("new_item").value = "";
        state.items[newItemName] = new Item(newItemName, []);
        var newItem = document.createElement("div");
        newItem.className = "item";
        var itemSheet = document.createElement("ul");
        itemSheet.className = "item-sheet";
        var nameElement = document.createElement("li");
        var nameParagraph = document.createElement("p");
        nameParagraph.innerText = newItemName;
        nameElement.appendChild(nameParagraph);
        itemSheet.appendChild(nameElement);
        var slotElement = document.createElement("li");
        var slotSelect = document.createElement("select");
        slotSelect.className = "slot-select";
        for (var _i = 0, slots_2 = slots; _i < slots_2.length; _i++) {
            var slot = slots_2[_i];
            var option = document.createElement("option");
            option.text = option.value = slot;
            slotSelect.appendChild(option);
        }
        slotSelect.value = slots[0];
        if (!itemsBySlot[slotSelect.value]) {
            itemsBySlot[slotSelect.value] = [newItemName];
        }
        else {
            itemsBySlot[slotSelect.value].push(newItemName);
        }
        for (var _a = 0, _b = Array.from(document.getElementsByClassName("item-".concat(slotSelect.value, "-select"))); _a < _b.length; _a++) {
            var element = _b[_a];
            var select = element;
            var option = document.createElement("option");
            option.text = option.value = newItemName;
            select.appendChild(option);
        }
        var previousValue = slotSelect.value;
        slotSelect.onchange = function () {
            state.items[newItemName].slot = slotSelect.value;
            if (!itemsBySlot[slotSelect.value]) {
                itemsBySlot[slotSelect.value] = [newItemName];
            }
            else {
                itemsBySlot[slotSelect.value].push(newItemName);
            }
            for (var _i = 0, _a = Array.from(document.getElementsByClassName("item-".concat(slotSelect.value, "-select"))); _i < _a.length; _i++) {
                var element = _a[_i];
                var select = element;
                var option = document.createElement("option");
                option.text = option.value = newItemName;
                select.appendChild(option);
            }
            itemsBySlot[previousValue].splice(itemsBySlot[previousValue].indexOf(newItemName), 1);
            for (var _b = 0, _c = Array.from(document.getElementsByClassName("item-".concat(previousValue, "-select"))); _b < _c.length; _b++) {
                var element = _c[_b];
                var select = element;
                for (var _d = 0, _e = Array.from(select.options); _d < _e.length; _d++) {
                    var option = _e[_d];
                    if (option.value === newItemName) {
                        select.removeChild(option);
                        break;
                    }
                }
            }
            previousValue = slotSelect.value;
        };
        slotElement.appendChild(slotSelect);
        itemSheet.appendChild(slotElement);
        var effectsElement = document.createElement("li");
        var effects = document.createElement("div");
        effects.className = "list";
        effectsElement.appendChild(effects);
        var effectAddInput = document.createElement("select");
        effectAddInput.className = "effect-select";
        for (var effectName in state.effects) {
            var option = document.createElement("option");
            option.value = option.innerText = effectName;
            effectAddInput.appendChild(option);
        }
        var effectAddButton = document.createElement("button");
        effectAddButton.innerText = "+";
        effectAddButton.onclick = function () {
            var selectedOption = effectAddInput.selectedOptions[0];
            var effectIndex = state.items[newItemName].effects.length;
            state.items[newItemName].effects.push(selectedOption.value);
            var newElement = document.createElement("div");
            var newEffect = document.createElement("p");
            newEffect.innerText = selectedOption.value;
            newElement.appendChild(newEffect);
            var deleteElement = document.createElement("button");
            deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
            deleteElement.onclick = function () {
                state.items[newItemName].effects.splice(effectIndex, 1);
                effectAddInput.appendChild(selectedOption);
                newElement.remove();
            };
            newElement.appendChild(deleteElement);
            effects.appendChild(newElement);
            effectAddInput.removeChild(selectedOption);
        };
        effectsElement.appendChild(effectAddInput);
        effectsElement.appendChild(effectAddButton);
        itemSheet.appendChild(effectsElement);
        var modifiersParagraph = document.createElement("p");
        modifiersParagraph.innerText = "Modifiers:";
        itemSheet.appendChild(modifiersParagraph);
        var modifierRefCount = {};
        var modifiersElement = document.createElement("ul");
        modifiersElement.style.listStyleType = "none";
        var modifierAddElement = document.createElement("li");
        var modifierAdd = document.createElement("button");
        modifierAdd.innerText = "Add modifier";
        modifierAdd.onclick = function () {
            var newModifier = document.createElement("li");
            newModifier.className = "single_value";
            var modifiedStat = document.createElement("select");
            modifiedStat.className = "stat-select";
            var selected = false;
            var i = 0;
            for (var _i = 0, _a = state.stats; _i < _a.length; _i++) {
                var stat = _a[_i];
                var statOption = document.createElement("option");
                statOption.innerText = statOption.value = stat;
                modifiedStat.appendChild(statOption);
                if (!Object.keys(state.items[newItemName].modifiers).includes(stat) &&
                    !selected) {
                    selected = true;
                    modifiedStat.selectedIndex = i;
                    if (isNaN(state.items[newItemName].modifiers[stat]))
                        state.items[newItemName].modifiers[stat] = 0;
                    modifierRefCount[stat] = isNaN(modifierRefCount[stat])
                        ? 1
                        : modifierRefCount[stat] + 1;
                }
                ++i;
            }
            if (!selected) {
                alert("All of the created stats have been used for this item, create a new stat or modify already existing modifier");
                modifiedStat.remove();
                newModifier.remove();
                return;
            }
            var previousStatName;
            modifiedStat.onfocus = function () {
                previousStatName = modifiedStat.value;
            };
            modifiedStat.onchange = function () {
                if (!isNaN(state.items[newItemName].modifiers[modifiedStat.value])) {
                    state.items[newItemName].modifiers[modifiedStat.value] +=
                        modifiedValue.valueAsNumber;
                }
                else {
                    state.items[newItemName].modifiers[modifiedStat.value] =
                        modifiedValue.valueAsNumber;
                }
                modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                    ? 1
                    : modifierRefCount[modifiedStat.value] + 1;
                if (!isNaN(state.items[newItemName].modifiers[previousStatName])) {
                    state.items[newItemName].modifiers[previousStatName] -=
                        modifiedValue.valueAsNumber;
                }
                else {
                    state.items[newItemName].modifiers[previousStatName] = 0;
                }
                --modifierRefCount[previousStatName];
                if (modifierRefCount[previousStatName] === 0 ||
                    isNaN(modifierRefCount[previousStatName])) {
                    delete state.items[newItemName].modifiers[previousStatName];
                }
                previousStatName = modifiedStat.value;
            };
            newModifier.appendChild(modifiedStat);
            var modifiedValue = document.createElement("input");
            modifiedValue.type = "number";
            modifiedValue.value = "0";
            var previousValue;
            modifiedValue.onfocus = function () {
                previousValue = modifiedValue.valueAsNumber;
            };
            modifiedValue.onchange = function () {
                if (isNaN(modifiedValue.valueAsNumber))
                    return;
                if (isNaN(state.items[newItemName].modifiers[modifiedStat.value])) {
                    state.items[newItemName].modifiers[modifiedStat.value] =
                        modifiedValue.valueAsNumber;
                }
                else {
                    state.items[newItemName].modifiers[modifiedStat.value] +=
                        modifiedValue.valueAsNumber - previousValue;
                }
                previousValue = modifiedValue.valueAsNumber;
            };
            newModifier.appendChild(modifiedValue);
            var deleteModifier = document.createElement("button");
            deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
            deleteModifier.onclick = function () {
                state.items[newItemName].modifiers[modifiedStat.value] -=
                    modifiedValue.valueAsNumber;
                --modifierRefCount[previousStatName];
                if (modifierRefCount[previousStatName] === 0 ||
                    isNaN(modifierRefCount[previousStatName])) {
                    delete state.items[newItemName].modifiers[previousStatName];
                }
                newModifier.remove();
            };
            newModifier.appendChild(deleteModifier);
            modifiersElement.appendChild(newModifier);
        };
        modifierAddElement.appendChild(modifierAdd);
        modifiersElement.appendChild(modifierAddElement);
        itemSheet.appendChild(modifiersElement);
        newItem.appendChild(itemSheet);
        for (var _c = 0, _d = Array.from(document.getElementsByClassName("item-select")); _c < _d.length; _c++) {
            var element = _d[_c];
            var select = element;
            var option = document.createElement("option");
            option.text = option.value = newItemName;
            select.appendChild(option);
        }
        var deleteItem = document.createElement("button");
        deleteItem.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
        deleteItem.onclick = function () {
            for (var _i = 0, _a = Array.from(document.getElementsByClassName("item-select")); _i < _a.length; _i++) {
                var element = _a[_i];
                var select = element;
                for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                    var option = _c[_b];
                    if (option.value === newItemName) {
                        select.removeChild(option);
                        break;
                    }
                }
            }
            delete state.items[newItemName];
            newItem.remove();
        };
        newItem.appendChild(deleteItem);
        itemsDiv.appendChild(newItem);
    };
    document.getElementById("new_effect").onkeydown = function (event) {
        if (event.key === "Enter")
            document.getElementById("add_effect").click();
    };
    document.getElementById("add_effect").onclick =
        function () {
            var effectsDiv = document.getElementById("effects");
            var newEffectName = document.getElementById("new_effect").value;
            document.getElementById("new_effect").value =
                "";
            state.effects[newEffectName] = new Effect(newEffectName, [], 5, "attack", "enemy", "on end", false);
            var newEffect = document.createElement("div");
            var effectSheet = document.createElement("ul");
            effectSheet.className = "effect-sheet";
            var nameElement = document.createElement("li");
            var nameParagraph = document.createElement("p");
            nameParagraph.innerText = newEffectName;
            nameElement.appendChild(nameParagraph);
            newEffect.appendChild(nameElement);
            var baseDurationElement = document.createElement("li");
            var baseDurationParagraph = document.createElement("p");
            baseDurationParagraph.innerText = "Base duration: ";
            baseDurationElement.appendChild(baseDurationParagraph);
            var baseDurationInput = document.createElement("input");
            baseDurationInput.type = "number";
            baseDurationInput.value = "5";
            baseDurationInput.onchange = function () {
                state.effects[newEffectName].baseDuration = state.effects[newEffectName].durationLeft = baseDurationInput.valueAsNumber;
            };
            baseDurationElement.appendChild(baseDurationInput);
            effectSheet.appendChild(baseDurationElement);
            var applyUniqueElement = document.createElement("li");
            var applyUniqueParagraph = document.createElement("p");
            applyUniqueParagraph.innerText = "Apply unique: ";
            applyUniqueElement.appendChild(applyUniqueParagraph);
            var applyUniqueInput = document.createElement("input");
            applyUniqueInput.type = "checkbox";
            applyUniqueInput.checked = false;
            applyUniqueInput.onchange = function () {
                state.effects[newEffectName].applyUnique =
                    applyUniqueInput.checked;
            };
            applyUniqueElement.appendChild(applyUniqueInput);
            effectSheet.appendChild(applyUniqueElement);
            var appliedOnElement = document.createElement("li");
            var appliedOnParagraph = document.createElement("p");
            appliedOnParagraph.innerText = "Applied on: ";
            appliedOnElement.appendChild(appliedOnParagraph);
            var appliedOnInput = document.createElement("select");
            for (var _i = 0, _a = [
                "attack",
                "defense",
                "battle start",
                "not applied",
            ]; _i < _a.length; _i++) {
                var option = _a[_i];
                var appliedOnOption = document.createElement("option");
                appliedOnOption.innerText = appliedOnOption.value = option;
                appliedOnInput.appendChild(appliedOnOption);
            }
            appliedOnInput.selectedIndex = 0;
            appliedOnInput.onchange = function () {
                switch (appliedOnInput.value) {
                    case "attack":
                    case "defense":
                    case "battle start":
                    case "not applied":
                        state.effects[newEffectName].appliedOn =
                            appliedOnInput.value;
                        break;
                    default:
                        document.getElementById("errors").innerHTML = "appliedOn invalid";
                }
            };
            appliedOnElement.appendChild(appliedOnInput);
            effectSheet.appendChild(appliedOnElement);
            var appliedToElement = document.createElement("li");
            var appliedToParagraph = document.createElement("p");
            appliedToParagraph.innerText = "Applied to: ";
            appliedToElement.appendChild(appliedToParagraph);
            var appliedToInput = document.createElement("select");
            for (var _b = 0, _c = ["enemy", "self"]; _b < _c.length; _b++) {
                var option = _c[_b];
                var appliedToOption = document.createElement("option");
                appliedToOption.innerText = appliedToOption.value = option;
                appliedToInput.appendChild(appliedToOption);
            }
            appliedToInput.selectedIndex = 0;
            appliedToInput.onchange = function () {
                switch (appliedToInput.value) {
                    case "self":
                    case "enemy":
                        state.effects[newEffectName].appliedTo =
                            appliedToInput.value;
                        break;
                    default:
                        document.getElementById("errors").innerHTML = "appliedTo invalid";
                }
            };
            appliedToElement.appendChild(appliedToInput);
            effectSheet.appendChild(appliedToElement);
            var impactElement = document.createElement("li");
            var impactParagraph = document.createElement("p");
            impactParagraph.innerText = "Impact: ";
            impactElement.appendChild(impactParagraph);
            var impactInput = document.createElement("select");
            for (var _d = 0, _e = ["on end", "continuous", "every turn"]; _d < _e.length; _d++) {
                var option = _e[_d];
                var impactOption = document.createElement("option");
                impactOption.innerText = impactOption.value = option;
                impactInput.appendChild(impactOption);
            }
            impactInput.selectedIndex = 0;
            impactInput.onchange = function () {
                switch (impactInput.value) {
                    case "on end":
                    case "continuous":
                    case "every turn":
                        state.effects[newEffectName].impact = impactInput.value;
                        break;
                    default:
                        document.getElementById("errors").innerHTML = "impact invalid";
                }
            };
            impactElement.appendChild(impactInput);
            effectSheet.appendChild(impactElement);
            var modifiersParagraph = document.createElement("p");
            modifiersParagraph.innerText = "Modifiers:";
            effectSheet.appendChild(modifiersParagraph);
            var modifierRefCount = {};
            var modifiersElement = document.createElement("ul");
            modifiersElement.style.listStyleType = "none";
            var modifierAddElement = document.createElement("li");
            var modifierAdd = document.createElement("button");
            modifierAdd.innerText = "Add modifier";
            modifierAdd.onclick = function () {
                var newModifier = document.createElement("li");
                newModifier.className = "single_value";
                var modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                var selected = false;
                var i = 0;
                for (var _i = 0, _a = state.stats; _i < _a.length; _i++) {
                    var stat = _a[_i];
                    var statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (!Object.keys(state.effects[newEffectName].modifiers).includes(stat) &&
                        !selected) {
                        selected = true;
                        modifiedStat.selectedIndex = i;
                        if (isNaN(state.effects[newEffectName].modifiers[stat]))
                            state.effects[newEffectName].modifiers[stat] = 0;
                        modifierRefCount[stat] = isNaN(modifierRefCount[stat])
                            ? 1
                            : modifierRefCount[stat] + 1;
                    }
                    ++i;
                }
                if (!selected) {
                    alert("All of the created stats have been used for this effect, create a new stat or modify already existing modifier");
                    modifiedStat.remove();
                    newModifier.remove();
                    return;
                }
                var previousStatName;
                modifiedStat.onfocus = function () {
                    previousStatName = modifiedStat.value;
                };
                modifiedStat.onchange = function () {
                    if (!isNaN(state.effects[newEffectName].modifiers[modifiedStat.value])) {
                        state.effects[newEffectName].modifiers[modifiedStat.value] += modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[newEffectName].modifiers[modifiedStat.value] = modifiedValue.valueAsNumber;
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (!isNaN(state.effects[newEffectName].modifiers[previousStatName])) {
                        state.effects[newEffectName].modifiers[previousStatName] -= modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[newEffectName].modifiers[previousStatName] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.effects[newEffectName].modifiers[previousStatName];
                    }
                    previousStatName = modifiedStat.value;
                };
                newModifier.appendChild(modifiedStat);
                var modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                var previousValue;
                modifiedValue.onfocus = function () {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = function () {
                    if (isNaN(modifiedValue.valueAsNumber))
                        return;
                    if (isNaN(state.effects[newEffectName].modifiers[modifiedStat.value])) {
                        state.effects[newEffectName].modifiers[modifiedStat.value] = modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[newEffectName].modifiers[modifiedStat.value] += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
                deleteModifier.onclick = function () {
                    state.effects[newEffectName].modifiers[modifiedStat.value] -= modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            effectSheet.appendChild(modifiersElement);
            newEffect.appendChild(effectSheet);
            for (var _f = 0, _g = Array.from(document.getElementsByClassName("effect-select")); _f < _g.length; _f++) {
                var element = _g[_f];
                var select = element;
                var option = document.createElement("option");
                option.text = option.value = newEffectName;
                select.appendChild(option);
            }
            var deleteEffect = document.createElement("button");
            deleteEffect.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
            deleteEffect.onclick = function () {
                delete state.effects[newEffectName];
                for (var _i = 0, _a = Array.from(document.getElementsByClassName("effect-select")); _i < _a.length; _i++) {
                    var element = _a[_i];
                    var select = element;
                    for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                        var option = _c[_b];
                        if (option.value === newEffectName) {
                            select.removeChild(option);
                            break;
                        }
                    }
                }
                newEffect.remove();
            };
            effectsDiv.appendChild(newEffect);
        };
    document.getElementById("state_default").onclick =
        function () {
            state = copy(defaultState);
            state_text.value = JSON.stringify(state);
            UpdateFields();
        };
    document.getElementById("serialize").onclick = function () {
        return (state_text.value = JSON.stringify(state));
    };
    document.getElementById("deserialize").onclick =
        function () { return ParseState(state_text.value); };
    UpdateFields();
};
try {
    main();
}
catch (error) {
    var message = error instanceof Error ? error.message : JSON.stringify(error);
    document.getElementById("errors").innerHTML =
        message;
}
