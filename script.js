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
var slots = [];
var itemsBySlot = {};
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
        itemsBySlot = {};
        UpdateFields();
    }
    else
        return errors;
};
var t = false;
var UpdateFields = function () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var _j;
    console.log("updating fields");
    slots = [];
    console.log("dice");
    document.getElementById("dice").value = String(state.dice);
    console.log("starting level");
    document.getElementById("startingLevel").value =
        String(state.startingLevel);
    console.log("starting hp");
    document.getElementById("startingHP").value = String(state.startingHP);
    console.log("skillpoints on lvl up");
    document.getElementById("skillpointsOnLevelUp").value = String(state.skillpointsOnLevelUp);
    console.log("punishment");
    document.getElementById("punishment").value = String(state.punishment);
    console.log("in battle");
    document.getElementById("inBattle").checked =
        state.inBattle;
    console.log("effects outside battle");
    document.getElementById("effectsOutsideBattle").checked = state.runEffectsOutsideBattle;
    console.log("in");
    document.getElementById("in").value = String(state.in);
    console.log("ctxt");
    document.getElementById("ctxt").value = String(state.ctxt);
    console.log("out");
    document.getElementById("out").value = String(state.out);
    console.log("slots");
    document.getElementById("slots").innerHTML = "";
    {
        var slotsDiv = document.getElementById("slots");
        var _loop_1 = function (item) {
            if (!slots.includes(item.slot)) {
                slots.push(item.slot);
                var newDiv_1 = document.createElement("div");
                newDiv_1.className = "single_value";
                var inputElement_1 = document.createElement("input");
                inputElement_1.value = item.slot;
                inputElement_1.onchange = function () {
                    slots[slots.indexOf(inputElement_1.value)] =
                        inputElement_1.value;
                };
                newDiv_1.appendChild(inputElement_1);
                var _loop_10 = function (element) {
                    var equipment = element;
                    var slotElement = document.createElement("li");
                    var slotName = document.createElement("p");
                    slotName.innerText = item.slot;
                    slotElement.appendChild(slotName);
                    var equippedItem = document.createElement("select");
                    equippedItem.className = "item-".concat(item.slot, "-select item-slot-select");
                    (_a = itemsBySlot[_j = item.slot]) !== null && _a !== void 0 ? _a : (itemsBySlot[_j] = []);
                    for (var _4 = 0, _5 = itemsBySlot[item.slot]; _4 < _5.length; _4++) {
                        var itemName = _5[_4];
                        var option = document.createElement("option");
                        option.text = option.value = itemName;
                        equippedItem.appendChild(option);
                    }
                    var characterName = (_c = (_b = element.id.match(/([\w\s ']+)-equipment/)) === null || _b === void 0 ? void 0 : _b.groups) === null || _c === void 0 ? void 0 : _c[0];
                    if (!characterName) {
                        console.error("slot parse: character's name could not be found");
                        return "continue";
                    }
                    equippedItem.onchange = function () {
                        if (equippedItem.value === "None")
                            delete state.characters[characterName].items[item.slot];
                        else
                            state.characters[characterName].items[item.slot] =
                                state.items[equippedItem.value];
                    };
                    slotElement.appendChild(equippedItem);
                    equipment.appendChild(slotElement);
                };
                for (var _2 = 0, _3 = Array.from(document.getElementsByClassName("equipment-list")); _2 < _3.length; _2++) {
                    var element = _3[_2];
                    _loop_10(element);
                }
                var deleteSlot = document.createElement("button");
                deleteSlot.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n          </svg>";
                deleteSlot.onclick = function () {
                    var _a;
                    for (var _i = 0, _b = Array.from(document.getElementsByClassName("slot-select")); _i < _b.length; _i++) {
                        var element = _b[_i];
                        var select = element;
                        for (var _c = 0, _d = Array.from(select.options); _c < _d.length; _c++) {
                            var option = _d[_c];
                            if (option.value === item.slot) {
                                select.removeChild(option);
                                break;
                            }
                        }
                    }
                    for (var _e = 0, _f = Array.from(document.getElementsByClassName("item-".concat(item.slot, "-select"))); _e < _f.length; _e++) {
                        var element = _f[_e];
                        (_a = element.parentElement) === null || _a === void 0 ? void 0 : _a.remove();
                    }
                    newDiv_1.remove();
                    slots.splice(slots.indexOf(inputElement_1.value), 1);
                };
                newDiv_1.appendChild(deleteSlot);
                slotsDiv.appendChild(newDiv_1);
            }
        };
        for (var _i = 0, _k = Object.values(state.items); _i < _k.length; _i++) {
            var item = _k[_i];
            _loop_1(item);
        }
    }
    console.log("stats");
    document.getElementById("stats").innerHTML = "";
    {
        var statsDiv = document.getElementById("stats");
        var _loop_2 = function (stat) {
            var newStat = stat;
            var newDiv = document.createElement("div");
            newDiv.className = "single_value";
            var inputElement = document.createElement("input");
            inputElement.value = stat;
            inputElement.onchange = function () {
                state.stats[state.stats.indexOf(stat)] = inputElement.value;
            };
            newDiv.appendChild(inputElement);
            for (var _6 = 0, _7 = Array.from(document.getElementsByClassName("stat-select")); _6 < _7.length; _6++) {
                var element = _7[_6];
                var select = element;
                var option = document.createElement("option");
                option.text = option.value = newStat;
                select.appendChild(option);
            }
            var deleteStat = document.createElement("button");
            deleteStat.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
            deleteStat.onclick = function () {
                for (var _i = 0, _a = Array.from(document.getElementsByClassName("stat-select")); _i < _a.length; _i++) {
                    var element = _a[_i];
                    var select = element;
                    for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                        var option = _c[_b];
                        if (option.value === newStat) {
                            select.removeChild(option);
                            break;
                        }
                    }
                }
                newDiv.remove();
                state.stats.splice(state.stats.indexOf(stat), 1);
            };
            newDiv.appendChild(deleteStat);
            statsDiv.appendChild(newDiv);
        };
        for (var _l = 0, _m = state.stats; _l < _m.length; _l++) {
            var stat = _m[_l];
            _loop_2(stat);
        }
    }
    console.log("inventory");
    document.getElementById("inventory").innerHTML = "";
    {
        var inventoryDiv = document.getElementById("inventory");
        var _loop_3 = function (inventoryItemName) {
            var newDiv = document.createElement("div");
            newDiv.className = "single_value";
            var newSelect = document.createElement("select");
            newSelect.className = "item-select";
            for (var itemName in state.items) {
                var option = document.createElement("option");
                option.value = option.innerText = itemName;
                newSelect.appendChild(option);
            }
            newSelect.value = inventoryItemName;
            newDiv.appendChild(newSelect);
            var deleteItem = document.createElement("button");
            deleteItem.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n    <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n    <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n    </svg>";
            deleteItem.onclick = function () {
                newDiv.remove();
                state.inventory.splice(state.inventory.indexOf(newSelect.value), 1);
            };
            newDiv.appendChild(deleteItem);
            inventoryDiv.appendChild(newDiv);
            var previousValue = newSelect.value;
            newSelect.onchange = function () {
                state.inventory[state.inventory.indexOf(previousValue)] =
                    newSelect.value;
                previousValue = newSelect.value;
            };
        };
        for (var _o = 0, _p = state.inventory; _o < _p.length; _o++) {
            var inventoryItemName = _p[_o];
            _loop_3(inventoryItemName);
        }
    }
    console.log("side1");
    document.getElementById("side1").innerHTML = "";
    {
        (_d = state.side1) !== null && _d !== void 0 ? _d : (state.side1 = []);
        var side1Div = document.getElementById("side1");
        var _loop_4 = function (characterName) {
            var newDiv = document.createElement("div");
            newDiv.className = "single_value";
            var characterSelect = document.getElementById("new_character_side1");
            var selectedOption = characterSelect.selectedOptions[0];
            for (var _8 = 0, _9 = Array.from(characterSelect.options); _8 < _9.length; _8++) {
                var option = _9[_8];
                if (option.value === characterName) {
                    selectedOption = option;
                    characterSelect.removeChild(selectedOption);
                    break;
                }
            }
            state.side1.push(characterName);
            var characterParagraph = document.createElement("p");
            characterParagraph.innerText = characterName;
            newDiv.appendChild(characterParagraph);
            var deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
            deleteCharacter.onclick = function () {
                var _a, _b;
                newDiv.remove();
                (_a = state.side1) === null || _a === void 0 ? void 0 : _a.splice((_b = state.side1) === null || _b === void 0 ? void 0 : _b.indexOf(characterName), 1);
                if (Object.keys(state.characters).includes(selectedOption.value))
                    characterSelect.appendChild(selectedOption);
            };
            newDiv.appendChild(deleteCharacter);
            side1Div.appendChild(newDiv);
        };
        for (var _q = 0, _r = state.side1; _q < _r.length; _q++) {
            var characterName = _r[_q];
            _loop_4(characterName);
        }
    }
    console.log("side2");
    document.getElementById("side2").innerHTML = "";
    {
        (_e = state.side2) !== null && _e !== void 0 ? _e : (state.side2 = []);
        var side2Div = document.getElementById("side2");
        var _loop_5 = function (characterName) {
            var newDiv = document.createElement("div");
            newDiv.className = "single_value";
            var characterSelect = document.getElementById("new_character_side2");
            var selectedOption = characterSelect.selectedOptions[0];
            for (var _10 = 0, _11 = Array.from(characterSelect.options); _10 < _11.length; _10++) {
                var option = _11[_10];
                if (option.value === characterName) {
                    selectedOption = option;
                    characterSelect.removeChild(selectedOption);
                    break;
                }
            }
            state.side2.push(characterName);
            var characterParagraph = document.createElement("p");
            characterParagraph.innerText = characterName;
            newDiv.appendChild(characterParagraph);
            var deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
            deleteCharacter.onclick = function () {
                var _a, _b;
                newDiv.remove();
                (_a = state.side2) === null || _a === void 0 ? void 0 : _a.splice((_b = state.side2) === null || _b === void 0 ? void 0 : _b.indexOf(characterName), 1);
                if (Object.keys(state.characters).includes(selectedOption.value))
                    characterSelect.appendChild(selectedOption);
            };
            newDiv.appendChild(deleteCharacter);
            side2Div.appendChild(newDiv);
        };
        for (var _s = 0, _t = state.side2; _s < _t.length; _s++) {
            var characterName = _t[_s];
            _loop_5(characterName);
        }
    }
    console.log("active");
    document.getElementById("active").innerHTML = "";
    {
        (_f = state.active) !== null && _f !== void 0 ? _f : (state.active = []);
        var activeDiv = document.getElementById("active");
        var _loop_6 = function (characterName) {
            var newDiv = document.createElement("div");
            newDiv.className = "single_value";
            var characterSelect = document.getElementById("new_character_active");
            var selectedOption;
            for (var _12 = 0, _13 = Array.from(characterSelect.options); _12 < _13.length; _12++) {
                var option = _13[_12];
                if (option.value === characterName) {
                    selectedOption = option;
                    characterSelect.removeChild(option);
                    break;
                }
            }
            var characterParagraph = document.createElement("p");
            characterParagraph.innerText = characterName;
            newDiv.appendChild(characterParagraph);
            var deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n          </svg>";
            deleteCharacter.onclick = function () {
                var _a, _b;
                newDiv.remove();
                (_a = state.active) === null || _a === void 0 ? void 0 : _a.splice((_b = state.active) === null || _b === void 0 ? void 0 : _b.indexOf(characterName), 1);
                if (Object.keys(state.characters).includes(selectedOption.value))
                    characterSelect.appendChild(selectedOption);
            };
            newDiv.appendChild(deleteCharacter);
            activeDiv.appendChild(newDiv);
        };
        for (var _u = 0, _v = state.active; _u < _v.length; _u++) {
            var characterName = _v[_u];
            _loop_6(characterName);
        }
    }
    console.log("characters");
    document.getElementById("characters").innerHTML = "";
    {
        var charactersDiv = document.getElementById("characters");
        var _loop_7 = function (characterName) {
            var character = state.characters[characterName];
            var newCharacter = document.createElement("div");
            newCharacter.className = "character";
            var characterSheet = document.createElement("ul");
            characterSheet.className = "character-sheet";
            var nameElement = document.createElement("li");
            var nameParagraph = document.createElement("p");
            nameParagraph.innerText = characterName;
            nameElement.appendChild(nameParagraph);
            characterSheet.appendChild(nameElement);
            var levelElement = document.createElement("li");
            var levelParagraph = document.createElement("p");
            levelParagraph.innerText = "Level: ";
            var levelInput = document.createElement("input");
            levelInput.type = "number";
            levelInput.value = String(state.characters[characterName].level);
            levelInput.onchange = function () {
                state.characters[characterName].level =
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
            experienceInput.value = String(state.characters[characterName].experience);
            experienceInput.onchange = function () {
                state.characters[characterName].experience =
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
            expToNextLvlInput.value = String(state.characters[characterName].expToNextLvl);
            expToNextLvlInput.onchange = function () {
                state.characters[characterName].expToNextLvl =
                    expToNextLvlInput.valueAsNumber;
            };
            expToNextLvlElement.appendChild(expToNextLvlParagraph);
            expToNextLvlElement.appendChild(expToNextLvlInput);
            characterSheet.appendChild(expToNextLvlElement);
            var skillpointsElement = document.createElement("li");
            var skillpointsParagraph = document.createElement("p");
            skillpointsParagraph.innerText = "Skillpoints:";
            var skillpointsInput = document.createElement("input");
            skillpointsInput.type = "number";
            skillpointsInput.value = String(state.characters[characterName].skillpoints);
            skillpointsInput.onchange = function () {
                state.characters[characterName].skillpoints =
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
            modifierAdd.innerText = "Add stat";
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
                    if (!Object.keys(state.characters[characterName].stats).includes(stat) &&
                        !selected) {
                        selected = true;
                        modifiedStat.selectedIndex = i;
                        if (!state.characters[characterName].stats[stat])
                            state.characters[characterName].stats[stat] =
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
                    if (state.characters[characterName].stats[modifiedStat.value]) {
                        state.characters[characterName].stats[modifiedStat.value].level += modifiedValue.valueAsNumber;
                    }
                    else {
                        state.characters[characterName].stats[modifiedStat.value] = new Stat(modifiedStat.value, modifiedValue.valueAsNumber);
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (state.characters[characterName].stats[previousStatName]) {
                        state.characters[characterName].stats[previousStatName].level -= modifiedValue.valueAsNumber;
                    }
                    else {
                        state.characters[characterName].stats[previousStatName] = new Stat(previousStatName, 0);
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.characters[characterName].stats[previousStatName];
                    }
                    previousStatName = modifiedStat.value;
                };
                newModifier.appendChild(modifiedStat);
                var modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                var previousValue = modifiedValue.valueAsNumber;
                modifiedValue.onfocus = function () {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = function () {
                    if (isNaN(modifiedValue.valueAsNumber))
                        return;
                    if (!state.characters[characterName].stats[modifiedStat.value]) {
                        state.characters[characterName].stats[modifiedStat.value] = new Stat(modifiedStat.value, modifiedValue.valueAsNumber);
                    }
                    else {
                        state.characters[characterName].stats[modifiedStat.value].level += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteModifier.onclick = function () {
                    state.characters[characterName].stats[modifiedStat.value].level -= modifiedValue.valueAsNumber;
                    if (state.characters[characterName].stats[modifiedStat.value].level == 0)
                        delete state.characters[characterName].stats[modifiedStat.value];
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            var _loop_11 = function (statName) {
                var newModifier = document.createElement("li");
                newModifier.className = "single_value";
                var modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                for (var _21 = 0, _22 = state.stats; _21 < _22.length; _21++) {
                    var stat = _22[_21];
                    var statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                }
                modifiedStat.value = statName;
                var previousStatName;
                modifiedStat.onfocus = function () {
                    previousStatName = modifiedStat.value;
                };
                modifiedStat.onchange = function () {
                    if (state.characters[characterName].stats[modifiedStat.value]) {
                        state.characters[characterName].stats[modifiedStat.value].level += modifiedValue.valueAsNumber;
                    }
                    else {
                        state.characters[characterName].stats[modifiedStat.value] = new Stat(modifiedStat.value, modifiedValue.valueAsNumber);
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (state.characters[characterName].stats[previousStatName]) {
                        state.characters[characterName].stats[previousStatName].level -= modifiedValue.valueAsNumber;
                    }
                    else {
                        state.characters[characterName].stats[previousStatName] = new Stat(previousStatName, 0);
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.characters[characterName].stats[previousStatName];
                    }
                    previousStatName = modifiedStat.value;
                };
                newModifier.appendChild(modifiedStat);
                var modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value =
                    character.stats[statName].level.toString();
                var previousValue = modifiedValue.valueAsNumber;
                modifiedValue.onfocus = function () {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = function () {
                    if (isNaN(modifiedValue.valueAsNumber))
                        return;
                    if (!state.characters[characterName].stats[modifiedStat.value]) {
                        state.characters[characterName].stats[modifiedStat.value] = new Stat(modifiedStat.value, modifiedValue.valueAsNumber);
                    }
                    else {
                        state.characters[characterName].stats[modifiedStat.value].level += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteModifier.onclick = function () {
                    state.characters[characterName].stats[modifiedStat.value].level -= modifiedValue.valueAsNumber;
                    if (state.characters[characterName].stats[modifiedStat.value].level == 0)
                        delete state.characters[characterName].stats[modifiedStat.value];
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            for (var _14 = 0, _15 = Object.keys(character.stats); _14 < _15.length; _14++) {
                var statName = _15[_14];
                _loop_11(statName);
            }
            characterSheet.appendChild(modifiersElement);
            var equipmentElement = document.createElement("li");
            var equipmentParagraph = document.createElement("p");
            equipmentParagraph.innerText = "Equipment:";
            equipmentElement.appendChild(equipmentParagraph);
            var equipment = document.createElement("ul");
            equipment.className = "equipment-list";
            equipment.id = "".concat(characterName.replace(" ", "-"), "-equipment");
            var _loop_12 = function (slot) {
                var slotElement = document.createElement("li");
                var slotName = document.createElement("p");
                slotName.innerText = slot;
                slotElement.appendChild(slotName);
                var equippedItem = document.createElement("select");
                equippedItem.className = "item-".concat(slot, "-select item-slot-select");
                (_g = itemsBySlot[slot]) !== null && _g !== void 0 ? _g : (itemsBySlot[slot] = []);
                for (var _23 = 0, _24 = itemsBySlot[slot]; _23 < _24.length; _23++) {
                    var itemName = _24[_23];
                    var option_1 = document.createElement("option");
                    option_1.text = option_1.value = itemName;
                    equippedItem.appendChild(option_1);
                }
                var option = document.createElement("option");
                option.text = option.value = "None";
                equippedItem.appendChild(option);
                equippedItem.value = "None";
                if (character.items[slot])
                    equippedItem.value = character.items[slot].name;
                equippedItem.onchange = function () {
                    if (equippedItem.value === "None")
                        delete state.characters[characterName].items[slot];
                    else
                        state.characters[characterName].items[slot] =
                            state.items[equippedItem.value];
                };
                slotElement.appendChild(equippedItem);
                equipment.appendChild(slotElement);
            };
            for (var _16 = 0, slots_1 = slots; _16 < slots_1.length; _16++) {
                var slot = slots_1[_16];
                _loop_12(slot);
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
            (_h = character.activeEffects) !== null && _h !== void 0 ? _h : (character.activeEffects = []);
            var _loop_13 = function (effect) {
                var newElement = document.createElement("div");
                var newEffect = document.createElement("p");
                newEffect.innerText = effect.name;
                newElement.appendChild(newEffect);
                var deleteElement = document.createElement("button");
                deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n        </svg>";
                var effectOption = effectAddInput.options[0];
                for (var _25 = 0, _26 = Array.from(effectAddInput.options); _25 < _26.length; _25++) {
                    var option = _26[_25];
                    if (option.value === effect.name) {
                        effectOption = option;
                        break;
                    }
                }
                deleteElement.onclick = function () {
                    var _a, _b;
                    if (!character.activeEffects) {
                        console.error("Effects disappeared?!");
                        return;
                    }
                    (_a = character.activeEffects) === null || _a === void 0 ? void 0 : _a.splice((_b = character.activeEffects) === null || _b === void 0 ? void 0 : _b.indexOf(effect), 1);
                    if (effectOption)
                        effectAddInput.appendChild(effectOption);
                    newElement.remove();
                };
                newElement.appendChild(deleteElement);
                effects.appendChild(newElement);
                if (effectOption)
                    effectAddInput.removeChild(effectOption);
            };
            for (var _17 = 0, _18 = character.activeEffects; _17 < _18.length; _17++) {
                var effect = _18[_17];
                _loop_13(effect);
            }
            var effectAddButton = document.createElement("button");
            effectAddButton.innerText = "+";
            effectAddButton.onclick = function () {
                var _a, _b;
                if (!state.characters[characterName].activeEffects) {
                    state.characters[characterName].activeEffects = [];
                }
                var selectedOption = effectAddInput.selectedOptions[0];
                (_a = state.characters[characterName].activeEffects) === null || _a === void 0 ? void 0 : _a.push(state.effects[selectedOption.value]);
                var newElement = document.createElement("div");
                var newEffect = document.createElement("p");
                newEffect.innerText = selectedOption.value;
                newElement.appendChild(newEffect);
                (_b = state.characters[characterName].activeEffects) === null || _b === void 0 ? void 0 : _b.push(state.effects[effectAddInput.value]);
                var deleteElement = document.createElement("button");
                deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n        </svg>";
                deleteElement.onclick = function () {
                    var _a, _b, _c;
                    if (!state.characters[characterName].activeEffects) {
                        console.error("Effects disappeared?!");
                        return;
                    }
                    (_a = state.characters[characterName].activeEffects) === null || _a === void 0 ? void 0 : _a.splice((_c = (_b = state.characters[characterName].activeEffects) === null || _b === void 0 ? void 0 : _b.indexOf(state.effects[selectedOption.value])) !== null && _c !== void 0 ? _c : 0, 1);
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
            for (var _19 = 0, _20 = Array.from(document.getElementsByClassName("character-select")); _19 < _20.length; _19++) {
                var element = _20[_19];
                var select = element;
                var option = document.createElement("option");
                option.text = option.value = characterName;
                select.appendChild(option);
            }
            var deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
            deleteCharacter.onclick = function () {
                for (var _i = 0, _a = Array.from(document.getElementsByClassName("character-select")); _i < _a.length; _i++) {
                    var element = _a[_i];
                    var select = element;
                    for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                        var option = _c[_b];
                        if (option.value === characterName) {
                            select.removeChild(option);
                            break;
                        }
                    }
                }
                delete state.characters[characterName];
                newCharacter.remove();
            };
            newCharacter.appendChild(deleteCharacter);
            charactersDiv.appendChild(newCharacter);
        };
        for (var _w = 0, _x = Object.keys(state.characters); _w < _x.length; _w++) {
            var characterName = _x[_w];
            _loop_7(characterName);
        }
    }
    document.getElementById("items").innerHTML = "";
    {
        var itemsDiv = document.getElementById("items");
        var _loop_8 = function (itemName) {
            console.log(itemName);
            var item = state.items[itemName];
            var newItem = document.createElement("div");
            newItem.className = "item";
            var itemSheet = document.createElement("ul");
            itemSheet.className = "item-sheet";
            var nameElement = document.createElement("li");
            var nameParagraph = document.createElement("p");
            nameParagraph.innerText = itemName;
            nameElement.appendChild(nameParagraph);
            itemSheet.appendChild(nameElement);
            var slotElement = document.createElement("li");
            var slotSelect = document.createElement("select");
            slotSelect.className = "slot-select";
            for (var _27 = 0, slots_2 = slots; _27 < slots_2.length; _27++) {
                var slot = slots_2[_27];
                var option = document.createElement("option");
                option.text = option.value = slot;
                slotSelect.appendChild(option);
            }
            slotSelect.value = item.slot;
            if (!itemsBySlot[slotSelect.value]) {
                itemsBySlot[slotSelect.value] = [itemName];
            }
            else {
                itemsBySlot[slotSelect.value].push(itemName);
            }
            for (var _28 = 0, _29 = Array.from(document.getElementsByClassName("item-".concat(slotSelect.value, "-select"))); _28 < _29.length; _28++) {
                var element = _29[_28];
                var select = element;
                var option = document.createElement("option");
                option.text = option.value = itemName;
                select.appendChild(option);
            }
            var previousValue = slotSelect.value;
            slotSelect.onchange = function () {
                state.items[itemName].slot = slotSelect.value;
                if (!itemsBySlot[slotSelect.value]) {
                    itemsBySlot[slotSelect.value] = [itemName];
                }
                else {
                    itemsBySlot[slotSelect.value].push(itemName);
                }
                for (var _i = 0, _a = Array.from(document.getElementsByClassName("item-".concat(slotSelect.value, "-select"))); _i < _a.length; _i++) {
                    var element = _a[_i];
                    var select = element;
                    var option = document.createElement("option");
                    option.text = option.value = itemName;
                    select.appendChild(option);
                }
                itemsBySlot[previousValue].splice(itemsBySlot[previousValue].indexOf(itemName), 1);
                for (var _b = 0, _c = Array.from(document.getElementsByClassName("item-".concat(previousValue, "-select"))); _b < _c.length; _b++) {
                    var element = _c[_b];
                    var select = element;
                    for (var _d = 0, _e = Array.from(select.options); _d < _e.length; _d++) {
                        var option = _e[_d];
                        if (option.value === itemName) {
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
            var _loop_14 = function (effectName) {
                var newElement = document.createElement("div");
                var newEffect = document.createElement("p");
                newEffect.innerText = effectName;
                newElement.appendChild(newEffect);
                var deleteElement = document.createElement("button");
                deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteElement.onclick = function () {
                    state.items[itemName].effects.splice(item.effects.indexOf(effectName), 1);
                    var option = document.createElement("option");
                    option.text = option.value = effectName;
                    effectAddInput.appendChild(option);
                    newElement.remove();
                };
                newElement.appendChild(deleteElement);
                effects.appendChild(newElement);
            };
            for (var _30 = 0, _31 = item.effects; _30 < _31.length; _30++) {
                var effectName = _31[_30];
                _loop_14(effectName);
            }
            effectsElement.appendChild(effects);
            var effectAddInput = document.createElement("select");
            effectAddInput.className = "effect-select";
            for (var effectName in state.effects) {
                if (item.effects.includes(effectName))
                    continue;
                var option = document.createElement("option");
                option.value = option.innerText = effectName;
                effectAddInput.appendChild(option);
            }
            var effectAddButton = document.createElement("button");
            effectAddButton.innerText = "+";
            effectAddButton.onclick = function () {
                var selectedOption = effectAddInput.selectedOptions[0];
                state.items[itemName].effects.push(selectedOption.value);
                var newElement = document.createElement("div");
                var newEffect = document.createElement("p");
                newEffect.innerText = selectedOption.value;
                newElement.appendChild(newEffect);
                var deleteElement = document.createElement("button");
                deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteElement.onclick = function () {
                    state.items[itemName].effects.splice(item.effects.indexOf(selectedOption.value), 1);
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
                    if (!Object.keys(state.items[itemName].modifiers).includes(stat) &&
                        !selected) {
                        selected = true;
                        modifiedStat.selectedIndex = i;
                        if (isNaN(state.items[itemName].modifiers[stat]))
                            state.items[itemName].modifiers[stat] = 0;
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
                    if (!isNaN(state.items[itemName].modifiers[modifiedStat.value])) {
                        state.items[itemName].modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        state.items[itemName].modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (!isNaN(state.items[itemName].modifiers[previousStatName])) {
                        state.items[itemName].modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        state.items[itemName].modifiers[previousStatName] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.items[itemName].modifiers[previousStatName];
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
                    if (isNaN(state.items[itemName].modifiers[modifiedStat.value])) {
                        state.items[itemName].modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        state.items[itemName].modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
                deleteModifier.onclick = function () {
                    state.items[itemName].modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.items[itemName].modifiers[previousStatName];
                    }
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            var _loop_15 = function (modifierName) {
                var modifierValue = item.modifiers[modifierName];
                var newModifier = document.createElement("li");
                newModifier.className = "single_value";
                var modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                for (var _34 = 0, _35 = state.stats.concat(["hp"]); _34 < _35.length; _34++) {
                    var stat = _35[_34];
                    var statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                }
                modifiedStat.value = modifierName;
                var previousStatName;
                modifiedStat.onfocus = function () {
                    previousStatName = modifiedStat.value;
                };
                modifiedStat.onchange = function () {
                    if (!isNaN(item.modifiers[modifiedStat.value])) {
                        item.modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        item.modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (!isNaN(item.modifiers[previousStatName])) {
                        item.modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        item.modifiers[previousStatName] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete item.modifiers[previousStatName];
                    }
                    previousStatName = modifiedStat.value;
                };
                newModifier.appendChild(modifiedStat);
                var modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = modifierValue.toString();
                var previousValue_1;
                modifiedValue.onfocus = function () {
                    previousValue_1 = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = function () {
                    if (isNaN(modifiedValue.valueAsNumber))
                        return;
                    if (isNaN(item.modifiers[modifiedStat.value])) {
                        item.modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        item.modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber - previousValue_1;
                    }
                    previousValue_1 = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteModifier.onclick = function () {
                    item.modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            for (var _32 = 0, _33 = Object.keys(item.modifiers); _32 < _33.length; _32++) {
                var modifierName = _33[_32];
                _loop_15(modifierName);
            }
            itemSheet.appendChild(modifiersElement);
            newItem.appendChild(itemSheet);
            var deleteItem = document.createElement("button");
            deleteItem.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
            deleteItem.onclick = function () {
                for (var _i = 0, _a = Array.from(document.getElementsByClassName("item-select")); _i < _a.length; _i++) {
                    var element = _a[_i];
                    var select = element;
                    for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                        var option = _c[_b];
                        if (option.value === itemName) {
                            select.removeChild(option);
                            break;
                        }
                    }
                }
                delete state.items[itemName];
                newItem.remove();
            };
            newItem.appendChild(deleteItem);
            itemsDiv.appendChild(newItem);
        };
        for (var _y = 0, _z = Object.keys(state.items); _y < _z.length; _y++) {
            var itemName = _z[_y];
            _loop_8(itemName);
        }
    }
    if (t) {
        console.log(state);
        return;
    }
    console.log("effects");
    document.getElementById("effects").innerHTML = "";
    {
        var effectsDiv = document.getElementById("effects");
        var _loop_9 = function (effectName) {
            var newEffect = document.createElement("div");
            var effectSheet = document.createElement("ul");
            effectSheet.className = "effect-sheet";
            var nameElement = document.createElement("li");
            var nameParagraph = document.createElement("p");
            nameParagraph.innerText = effectName;
            nameElement.appendChild(nameParagraph);
            effectSheet.appendChild(nameElement);
            var baseDurationElement = document.createElement("li");
            var baseDurationParagraph = document.createElement("p");
            baseDurationParagraph.innerText = "Base duration: ";
            baseDurationElement.appendChild(baseDurationParagraph);
            var baseDurationInput = document.createElement("input");
            baseDurationInput.type = "number";
            baseDurationInput.value =
                state.effects[effectName].baseDuration.toString();
            baseDurationInput.onchange = function () {
                state.effects[effectName].baseDuration = state.effects[effectName].durationLeft = baseDurationInput.valueAsNumber;
            };
            baseDurationElement.appendChild(baseDurationInput);
            effectSheet.appendChild(baseDurationElement);
            var applyUniqueElement = document.createElement("li");
            var applyUniqueParagraph = document.createElement("p");
            applyUniqueParagraph.innerText = "Apply unique: ";
            applyUniqueElement.appendChild(applyUniqueParagraph);
            var applyUniqueInput = document.createElement("input");
            applyUniqueInput.type = "checkbox";
            applyUniqueInput.checked = state.effects[effectName].applyUnique;
            applyUniqueInput.onchange = function () {
                state.effects[effectName].applyUnique =
                    applyUniqueInput.checked;
            };
            applyUniqueElement.appendChild(applyUniqueInput);
            effectSheet.appendChild(applyUniqueElement);
            var appliedOnElement = document.createElement("li");
            var appliedOnParagraph = document.createElement("p");
            appliedOnParagraph.innerText = "Applied on: ";
            appliedOnElement.appendChild(appliedOnParagraph);
            var appliedOnInput = document.createElement("select");
            for (var _36 = 0, _37 = [
                "attack",
                "defense",
                "battle start",
                "not applied",
            ]; _36 < _37.length; _36++) {
                var option = _37[_36];
                var appliedOnOption = document.createElement("option");
                appliedOnOption.innerText = appliedOnOption.value = option;
                appliedOnInput.appendChild(appliedOnOption);
            }
            appliedOnInput.value = state.effects[effectName].appliedOn;
            appliedOnInput.onchange = function () {
                switch (appliedOnInput.value) {
                    case "attack":
                    case "defense":
                    case "battle start":
                    case "not applied":
                        state.effects[effectName].appliedOn =
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
            for (var _38 = 0, _39 = ["enemy", "self"]; _38 < _39.length; _38++) {
                var option = _39[_38];
                var appliedToOption = document.createElement("option");
                appliedToOption.innerText = appliedToOption.value = option;
                appliedToInput.appendChild(appliedToOption);
            }
            appliedToInput.value = state.effects[effectName].appliedTo;
            appliedToInput.onchange = function () {
                switch (appliedToInput.value) {
                    case "self":
                    case "enemy":
                        state.effects[effectName].appliedTo =
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
            for (var _40 = 0, _41 = ["on end", "continuous", "every turn"]; _40 < _41.length; _40++) {
                var option = _41[_40];
                var impactOption = document.createElement("option");
                impactOption.innerText = impactOption.value = option;
                impactInput.appendChild(impactOption);
            }
            impactInput.value = state.effects[effectName].impact;
            impactInput.onchange = function () {
                switch (impactInput.value) {
                    case "on end":
                    case "continuous":
                    case "every turn":
                        state.effects[effectName].impact = impactInput.value;
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
                for (var _i = 0, _a = state.stats.concat(["hp"]); _i < _a.length; _i++) {
                    var stat = _a[_i];
                    var statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (!Object.keys(state.effects[effectName].modifiers).includes(stat) &&
                        !selected) {
                        selected = true;
                        modifiedStat.selectedIndex = i;
                        if (isNaN(state.effects[effectName].modifiers[stat]))
                            state.effects[effectName].modifiers[stat] = 0;
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
                    if (!isNaN(state.effects[effectName].modifiers[modifiedStat.value])) {
                        state.effects[effectName].modifiers[modifiedStat.value] += modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[effectName].modifiers[modifiedStat.value] = modifiedValue.valueAsNumber;
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (!isNaN(state.effects[effectName].modifiers[previousStatName])) {
                        state.effects[effectName].modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[effectName].modifiers[previousStatName] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.effects[effectName].modifiers[previousStatName];
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
                    if (isNaN(state.effects[effectName].modifiers[modifiedStat.value])) {
                        state.effects[effectName].modifiers[modifiedStat.value] = modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[effectName].modifiers[modifiedStat.value] += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteModifier.onclick = function () {
                    state.effects[effectName].modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            var _loop_16 = function (modifierName) {
                var modifierValue = state.effects[effectName].modifiers[modifierName];
                var newModifier = document.createElement("li");
                newModifier.className = "single_value";
                var modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                for (var _46 = 0, _47 = state.stats.concat(["hp"]); _46 < _47.length; _46++) {
                    var stat = _47[_46];
                    var statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                }
                modifiedStat.value = modifierName;
                var previousStatName;
                modifiedStat.onfocus = function () {
                    previousStatName = modifiedStat.value;
                };
                modifiedStat.onchange = function () {
                    if (!isNaN(state.effects[effectName].modifiers[modifiedStat.value])) {
                        state.effects[effectName].modifiers[modifiedStat.value] += modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[effectName].modifiers[modifiedStat.value] = modifiedValue.valueAsNumber;
                    }
                    modifierRefCount[modifiedStat.value] = isNaN(modifierRefCount[modifiedStat.value])
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;
                    if (!isNaN(state.effects[effectName].modifiers[previousStatName])) {
                        state.effects[effectName].modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[effectName].modifiers[previousStatName] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])) {
                        delete state.effects[effectName].modifiers[previousStatName];
                    }
                    previousStatName = modifiedStat.value;
                };
                newModifier.appendChild(modifiedStat);
                var modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = modifierValue.toString();
                var previousValue;
                modifiedValue.onfocus = function () {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = function () {
                    if (isNaN(modifiedValue.valueAsNumber))
                        return;
                    if (isNaN(state.effects[effectName].modifiers[modifiedStat.value])) {
                        state.effects[effectName].modifiers[modifiedStat.value] = modifiedValue.valueAsNumber;
                    }
                    else {
                        state.effects[effectName].modifiers[modifiedStat.value] += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);
                var deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteModifier.onclick = function () {
                    state.effects[effectName].modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            for (var _42 = 0, _43 = Object.keys(state.effects[effectName].modifiers); _42 < _43.length; _42++) {
                var modifierName = _43[_42];
                _loop_16(modifierName);
            }
            effectSheet.appendChild(modifiersElement);
            newEffect.appendChild(effectSheet);
            for (var _44 = 0, _45 = Array.from(document.getElementsByClassName("effect-select")); _44 < _45.length; _44++) {
                var element = _45[_44];
                var select = element;
                var option = document.createElement("option");
                option.text = option.value = effectName;
                select.appendChild(option);
            }
            var deleteEffect = document.createElement("button");
            deleteEffect.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
            deleteEffect.onclick = function () {
                delete state.effects[effectName];
                for (var _i = 0, _a = Array.from(document.getElementsByClassName("effect-select")); _i < _a.length; _i++) {
                    var element = _a[_i];
                    var select = element;
                    for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                        var option = _c[_b];
                        if (option.value === effectName) {
                            select.removeChild(option);
                            break;
                        }
                    }
                }
                newEffect.remove();
            };
            newEffect.appendChild(deleteEffect);
            effectsDiv.appendChild(newEffect);
        };
        for (var _0 = 0, _1 = Object.keys(state.effects); _0 < _1.length; _0++) {
            var effectName = _1[_0];
            _loop_9(effectName);
        }
    }
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
        var newStat = document.getElementById("new_stat").value.trim();
        document.getElementById("new_stat").value = "";
        state.stats.push(newStat);
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var inputElement = document.createElement("input");
        inputElement.value = newStat;
        inputElement.onchange = function () {
            state.stats[state.stats.indexOf(newStat)] = inputElement.value;
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
            for (var _i = 0, _a = Array.from(document.getElementsByClassName("stat-select")); _i < _a.length; _i++) {
                var element = _a[_i];
                var select = element;
                for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                    var option = _c[_b];
                    if (option.value === newStat) {
                        select.removeChild(option);
                        break;
                    }
                }
            }
            newDiv.remove();
            state.stats.splice(state.stats.indexOf(newStat), 1);
        };
        newDiv.appendChild(deleteStat);
        statsDiv.appendChild(newDiv);
    };
    document.getElementById("new_slot").onkeydown = function (event) {
        if (event.key === "Enter")
            document.getElementById("add_slot").click();
    };
    document.getElementById("add_slot").onclick = function () {
        var _a, _b;
        var slotsDiv = document.getElementById("slots");
        var newSlot = document.getElementById("new_slot").value.trim();
        document.getElementById("new_slot").value = "";
        slots.push(newSlot);
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var inputElement = document.createElement("input");
        inputElement.value = newSlot;
        inputElement.onchange = function () {
            slots[slots.indexOf(inputElement.value)] = inputElement.value;
        };
        newDiv.appendChild(inputElement);
        for (var _i = 0, _c = Array.from(document.getElementsByClassName("slot-select")); _i < _c.length; _i++) {
            var element = _c[_i];
            var select = element;
            var option = document.createElement("option");
            option.value = option.text = newSlot;
            select.appendChild(option);
        }
        var _loop_17 = function (element) {
            var equipment = element;
            var slotElement = document.createElement("li");
            var slotName = document.createElement("p");
            slotName.innerText = newSlot;
            slotElement.appendChild(slotName);
            var equippedItem = document.createElement("select");
            equippedItem.className = "item-".concat(newSlot, "-select item-slot-select");
            (_a = itemsBySlot[newSlot]) !== null && _a !== void 0 ? _a : (itemsBySlot[newSlot] = []);
            for (var _f = 0, _g = itemsBySlot[newSlot]; _f < _g.length; _f++) {
                var itemName = _g[_f];
                var option_2 = document.createElement("option");
                option_2.text = option_2.value = itemName;
                equippedItem.appendChild(option_2);
            }
            var option = document.createElement("option");
            option.text = option.value = "None";
            equippedItem.appendChild(option);
            var characterName = (_b = element.id.match(/([\w\s ']+)-equipment/)) === null || _b === void 0 ? void 0 : _b[1];
            if (!characterName) {
                console.error("add slot: character's name could not be found");
                return "continue";
            }
            equippedItem.onchange = function () {
                if (equippedItem.value === "None")
                    delete state.characters[characterName].items[newSlot];
                else
                    state.characters[characterName].items[newSlot] =
                        state.items[equippedItem.value];
            };
            slotElement.appendChild(equippedItem);
            equipment.appendChild(slotElement);
        };
        for (var _d = 0, _e = Array.from(document.getElementsByClassName("equipment-list")); _d < _e.length; _d++) {
            var element = _e[_d];
            _loop_17(element);
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
            slots.splice(slots.indexOf(inputElement.value), 1);
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
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var newSelect = document.createElement("select");
        newSelect.className = "item-select";
        for (var itemName in state.items) {
            var option = document.createElement("option");
            option.value = option.innerText = itemName;
            newSelect.appendChild(option);
        }
        state.inventory.push(newSelect.firstChild.value);
        newDiv.appendChild(newSelect);
        var deleteItem = document.createElement("button");
        deleteItem.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteItem.onclick = function () {
            newDiv.remove();
            state.inventory.splice(state.inventory.indexOf(newSelect.value), 1);
        };
        newDiv.appendChild(deleteItem);
        inventoryDiv.appendChild(newDiv);
        var previousValue = newSelect.value;
        newSelect.onchange = function () {
            state.inventory[state.inventory.indexOf(previousValue)] =
                newSelect.value;
            previousValue = newSelect.value;
        };
    };
    document.getElementById("add_character_side1").onclick = function () {
        var _a;
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }
        (_a = state.side1) !== null && _a !== void 0 ? _a : (state.side1 = []);
        var side1Div = document.getElementById("side1");
        var index = side1Div.childElementCount;
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var characterSelect = document.getElementById("new_character_side1");
        var characterName = characterSelect.value;
        var selectedOption = characterSelect.selectedOptions[0];
        characterSelect.removeChild(selectedOption);
        state.side1[index] = characterName;
        var characterParagraph = document.createElement("p");
        characterParagraph.innerText = characterName;
        newDiv.appendChild(characterParagraph);
        var deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteCharacter.onclick = function () {
            var _a, _b;
            newDiv.remove();
            (_a = state.side1) === null || _a === void 0 ? void 0 : _a.splice((_b = state.side1) === null || _b === void 0 ? void 0 : _b.indexOf(characterName), 1);
            if (Object.keys(state.characters).includes(selectedOption.value))
                characterSelect.appendChild(selectedOption);
        };
        newDiv.appendChild(deleteCharacter);
        side1Div.appendChild(newDiv);
    };
    document.getElementById("add_character_side2").onclick = function () {
        var _a;
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }
        (_a = state.side2) !== null && _a !== void 0 ? _a : (state.side2 = []);
        var side2Div = document.getElementById("side2");
        var index = side2Div.childElementCount;
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        var characterSelect = document.getElementById("new_character_side2");
        var characterName = characterSelect.value;
        var selectedOption = characterSelect.selectedOptions[0];
        characterSelect.removeChild(selectedOption);
        state.side2[index] = characterName;
        var characterParagraph = document.createElement("p");
        characterParagraph.innerText = characterName;
        newDiv.appendChild(characterParagraph);
        var deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteCharacter.onclick = function () {
            var _a, _b;
            newDiv.remove();
            (_a = state.side2) === null || _a === void 0 ? void 0 : _a.splice((_b = state.side2) === null || _b === void 0 ? void 0 : _b.indexOf(characterName), 1);
            if (Object.keys(state.characters).includes(selectedOption.value))
                characterSelect.appendChild(selectedOption);
        };
        newDiv.appendChild(deleteCharacter);
        side2Div.appendChild(newDiv);
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
        var characterSelect = document.getElementById("new_character_active");
        var characterName = characterSelect.value;
        var selectedOption = characterSelect.selectedOptions[0];
        characterSelect.removeChild(selectedOption);
        state.active[index] = characterName;
        var characterParagraph = document.createElement("p");
        characterParagraph.innerText = characterName;
        newDiv.appendChild(characterParagraph);
        var deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteCharacter.onclick = function () {
            var _a, _b;
            newDiv.remove();
            (_a = state.active) === null || _a === void 0 ? void 0 : _a.splice((_b = state.active) === null || _b === void 0 ? void 0 : _b.indexOf(characterName), 1);
            if (Object.keys(state.characters).includes(selectedOption.value))
                characterSelect.appendChild(selectedOption);
        };
        newDiv.appendChild(deleteCharacter);
        activeDiv.appendChild(newDiv);
    };
    document.getElementById("new_character").onkeydown = function (event) {
        if (event.key === "Enter")
            document.getElementById("add_character").click();
    };
    document.getElementById("add_character").onclick =
        function () {
            var _a;
            var charactersDiv = document.getElementById("characters");
            var newCharacterName = document.getElementById("new_character").value;
            if (Object.keys(state.characters).includes(newCharacterName)) {
                alert("Two characters with the same name cannot coexist");
                return;
            }
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
            skillpointsParagraph.innerText = "Skillpoints:";
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
            modifierAdd.innerText = "Add stat";
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
                var previousValue = modifiedValue.valueAsNumber;
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
                    if (state.characters[newCharacterName].stats[modifiedStat.value].level == 0)
                        delete state.characters[newCharacterName].stats[modifiedStat.value];
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
            equipment.id = "".concat(newCharacterName.replace(" ", "-"), "-equipment");
            var _loop_18 = function (slot) {
                var slotElement = document.createElement("li");
                var slotName = document.createElement("p");
                slotName.innerText = slot;
                slotElement.appendChild(slotName);
                var equippedItem = document.createElement("select");
                equippedItem.className = "item-".concat(slot, "-select item-slot-select");
                (_a = itemsBySlot[slot]) !== null && _a !== void 0 ? _a : (itemsBySlot[slot] = []);
                for (var _d = 0, _e = itemsBySlot[slot]; _d < _e.length; _d++) {
                    var itemName = _e[_d];
                    var option_3 = document.createElement("option");
                    option_3.text = option_3.value = itemName;
                    equippedItem.appendChild(option_3);
                }
                var option = document.createElement("option");
                option.text = option.value = "None";
                equippedItem.appendChild(option);
                equippedItem.value = "None";
                equippedItem.onchange = function () {
                    if (equippedItem.value === "None")
                        delete state.characters[newCharacterName].items[slot];
                    else
                        state.characters[newCharacterName].items[slot] =
                            state.items[equippedItem.value];
                };
                slotElement.appendChild(equippedItem);
                equipment.appendChild(slotElement);
            };
            for (var _i = 0, slots_3 = slots; _i < slots_3.length; _i++) {
                var slot = slots_3[_i];
                _loop_18(slot);
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
                var _a, _b;
                if (!state.characters[newCharacterName].activeEffects) {
                    state.characters[newCharacterName].activeEffects = [];
                }
                var selectedOption = effectAddInput.selectedOptions[0];
                (_a = state.characters[newCharacterName].activeEffects) === null || _a === void 0 ? void 0 : _a.push(state.effects[selectedOption.value]);
                var newElement = document.createElement("div");
                var newEffect = document.createElement("p");
                newEffect.innerText = selectedOption.value;
                newElement.appendChild(newEffect);
                (_b = state.characters[newCharacterName].activeEffects) === null || _b === void 0 ? void 0 : _b.push(state.effects[effectAddInput.value]);
                var deleteElement = document.createElement("button");
                deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
                deleteElement.onclick = function () {
                    var _a, _b, _c, _d;
                    var _e;
                    if (!state.characters[newCharacterName].activeEffects) {
                        console.error("Effects disappeared?!");
                        return;
                    }
                    (_a = (_e = state.characters[newCharacterName]).activeEffects) !== null && _a !== void 0 ? _a : (_e.activeEffects = []);
                    (_b = state.characters[newCharacterName].activeEffects) === null || _b === void 0 ? void 0 : _b.splice((_d = (_c = state.characters[newCharacterName].activeEffects) === null || _c === void 0 ? void 0 : _c.indexOf(state.effects[selectedOption.value])) !== null && _d !== void 0 ? _d : 0, 1);
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
            for (var _b = 0, _c = Array.from(document.getElementsByClassName("character-select")); _b < _c.length; _b++) {
                var element = _c[_b];
                var select = element;
                var option = document.createElement("option");
                option.text = option.value = newCharacterName;
                select.appendChild(option);
            }
            var deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n                <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n                <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n                </svg>";
            deleteCharacter.onclick = function () {
                for (var _i = 0, _a = Array.from(document.getElementsByClassName("character-select")); _i < _a.length; _i++) {
                    var element = _a[_i];
                    var select = element;
                    for (var _b = 0, _c = Array.from(select.options); _b < _c.length; _b++) {
                        var option = _c[_b];
                        if (option.value === newCharacterName) {
                            select.removeChild(option);
                            break;
                        }
                    }
                }
                delete state.characters[newCharacterName];
                newCharacter.remove();
            };
            newCharacter.appendChild(deleteCharacter);
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
        if (Object.keys(state.items).includes(newItemName)) {
            alert("Two items with the same name cannot coexist");
            return;
        }
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
        for (var _i = 0, slots_4 = slots; _i < slots_4.length; _i++) {
            var slot = slots_4[_i];
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
            state.items[newItemName].effects.push(selectedOption.value);
            var newElement = document.createElement("div");
            var newEffect = document.createElement("p");
            newEffect.innerText = selectedOption.value;
            newElement.appendChild(newEffect);
            var deleteElement = document.createElement("button");
            deleteElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n            <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n            <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n            </svg>";
            deleteElement.onclick = function () {
                state.items[newItemName].effects.splice(state.items[newItemName].effects.indexOf(selectedOption.value), 1);
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
            if (Object.keys(state.effects).includes(newEffectName)) {
                alert("Two effects with the same name cannot coexist");
                return;
            }
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
            effectSheet.appendChild(nameElement);
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
                for (var _i = 0, _a = state.stats.concat(["hp"]); _i < _a.length; _i++) {
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
            newEffect.appendChild(deleteEffect);
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
    console.error(error);
}
window.addEventListener("beforeunload", function (event) {
    event.preventDefault();
    event.returnValue = "";
});
var levellingToOblivion = confirm("Are you levelling to oblivion?\n(No by default; if in doubt, check Input Modifier on your scenario.)");
