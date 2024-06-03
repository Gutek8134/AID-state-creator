"use strict";
function copy(aObject) {
    // Prevent undefined objects
    // if (!aObject) return aObject;
    var bObject = Array.isArray(aObject) ? [] : {};
    var value, key;
    for (key in aObject) {
        // Prevent self-references to parent object
        // if (Object.is(aObject[key], aObject)) continue;
        value = aObject[key];
        bObject[key] = (typeof value === "object") ? copy(value) : value;
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
    out: "",
    message: "",
    inBattle: false,
};
var defaultState = copy(state);
var levellingToOblivion = true;
var stateKeys = Object.keys(state);
var RecursiveTypeCheck = function (originalObject, comparedObject, comparedObjectName) {
    if (typeof comparedObject !== typeof originalObject)
        return ["".concat(comparedObjectName, " is of incorrect type (").concat(typeof comparedObject, " instead of ").concat(typeof originalObject, ")")];
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
    document.getElementById("startingLevel").value = String(state.startingLevel);
    document.getElementById("startingHP").value = String(state.startingHP);
    document.getElementById("skillpointsOnLevelUp").value = String(state.skillpointsOnLevelUp);
    document.getElementById("punishment").value = String(state.punishment);
    document.getElementById("inBattle").checked = state.inBattle;
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
    document.getElementById("add_stat").onclick = function () {
        var statsDiv = document.getElementById("stats");
        var new_stat = document.getElementById("new_stat").value.trim();
        state.stats.push(new_stat);
        statsDiv.innerHTML += "\n<div class=\"single_value\" id=\"stat_".concat(state.stats.length, "\">\n        <p>").concat(state.stats[state.stats.length - 1], "</p>\n</div>");
    };
    document.getElementById("add_item_inventory").onclick = function () {
        var inventoryDiv = document.getElementById("inventory");
        var index = inventoryDiv.childElementCount;
        var div = document.createElement("div");
        div.className = "single_value";
        var selectElement = document.createElement("select");
        selectElement.id = "inventory_item_".concat(index);
        var optionA = document.createElement("option");
        optionA.value = optionA.innerText = "A";
        var optionB = document.createElement("option");
        optionB.value = optionB.innerText = "B";
        selectElement.appendChild(optionA);
        selectElement.appendChild(optionB);
        for (var itemName in state.items) {
            var option = document.createElement("option");
            option.value = option.innerText = itemName;
            selectElement.appendChild(option);
        }
        state.inventory[index] = selectElement.firstChild.value;
        div.appendChild(selectElement);
        inventoryDiv.appendChild(div);
        selectElement.onchange = function () {
            state.inventory[index] = selectElement.value;
        };
    };
    document.getElementById("add_character_side1").onclick = function () {
        var _a;
        var side1Div = document.getElementById("side1");
        side1Div.innerHTML += "\n<div class=\"single_value\"></div>";
        (_a = state.side1) !== null && _a !== void 0 ? _a : (state.side1 = []);
        state.inBattle = true;
    };
    document.getElementById("add_character_side2").onclick = function () {
        var _a;
        var side2Div = document.getElementById("side2");
        side2Div.innerHTML += "\n<div class=\"single_value\"></div>";
        (_a = state.side2) !== null && _a !== void 0 ? _a : (state.side2 = []);
        state.inBattle = true;
    };
    document.getElementById("add_character_active").onclick = function () {
        var activeDiv = document.getElementById("active");
        activeDiv.innerHTML += "\n<div class=\"single_value\"></div>";
        state.active = [];
        state.inBattle = true;
    };
    document.getElementById("state_default").onclick = function () {
        state = copy(defaultState);
        state_text.value = JSON.stringify(state);
        UpdateFields();
    };
    document.getElementById("serialize").onclick = function () { return ParseState(state_text.value); };
    document.getElementById("deserialize").onclick = function () { return state_text.value = JSON.stringify(state); };
    UpdateFields();
};
try {
    main();
}
catch (error) {
    var message = error instanceof Error ? error.message : JSON.stringify(error);
    document.getElementById("errors").innerHTML = message;
}
