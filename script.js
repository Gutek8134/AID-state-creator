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
    out: "",
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
        var new_stat = document.getElementById("new_stat").value.trim();
        document.getElementById("new_stat").value = "";
        state.stats.push(new_stat);
        var newDiv = document.createElement("div");
        newDiv.className = "single_value";
        newDiv.id = "stat_".concat(index);
        var inputElement = document.createElement("input");
        inputElement.value = state.stats[index];
        inputElement.onchange = function () {
            state.stats[index] = inputElement.value;
        };
        newDiv.appendChild(inputElement);
        var deleteStat = document.createElement("button");
        deleteStat.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-trash\" viewBox=\"0 0 16 16\">\n        <path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z\"/>\n        <path d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z\"/>\n      </svg>";
        deleteStat.onclick = function () {
            var _a;
            (_a = document.getElementById("stat_".concat(index))) === null || _a === void 0 ? void 0 : _a.remove();
            state.stats.splice(index, 1);
        };
        newDiv.appendChild(deleteStat);
        statsDiv.appendChild(newDiv);
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
