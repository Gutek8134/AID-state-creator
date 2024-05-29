function copy(aObject: any): any {
    // Prevent undefined objects
    // if (!aObject) return aObject;

    let bObject: Array<any> | { [key: string | number]: any } = Array.isArray(aObject) ? [] : {};

    let value: any, key: any;
    for (key in aObject) {

        // Prevent self-references to parent object
        // if (Object.is(aObject[key], aObject)) continue;

        value = aObject[key];

        bObject[key] = (typeof value === "object") ? copy(value) : value;
    }

    return bObject;
}

class Effect {
    name: string;
    modifiers: { [key: string]: number };
    baseDuration: number;
    durationLeft: number;
    applyUnique: boolean;
    appliedOn: "attack" | "defense" | "battle start" | "not applied";
    appliedTo: "self" | "enemy";
    impact: "on end" | "continuous" | "every turn";
    readonly type: "effect";
    [key: string]: string | number | boolean | { [key: string]: number };

    constructor(
        inName: string,
        inModifiers: [string, number][],
        inDuration: number,
        inAppliedOn: "attack" | "defense" | "battle start" | "not applied",
        inAppliedTo: "self" | "enemy",
        inImpact: "on end" | "continuous" | "every turn",
        inApplyUnique: boolean = true
    ) {
        this.name = inName;
        this.modifiers = Object.fromEntries(inModifiers);
        this.durationLeft = this.baseDuration = inDuration;
        this.applyUnique = inApplyUnique;
        this.appliedOn = inAppliedOn;
        this.appliedTo = inAppliedTo;
        this.impact = inImpact;
        this.type = "effect";
    }
}

class Item {
    //slot - string representing slot name
    slot: string = "artifact";
    effects: string[];
    modifiers: { [key: string]: number };
    name: string;
    type: "character" | "item" | "stat";
    [key: string]: string | string[] | { [key: string]: number };

    constructor(name: string, values: [string, string | number][]) {
        this.effects = [];

        this.modifiers = {};

        if (values !== undefined) {
            //el in format ["slot/stat", "equipmentPart"/statObj]
            //Sanitized beforehand
            for (const [name, value] of values) {
                //Slot and effects are strings, everything else must be a number
                //Until buffs and debuffs will be extended to items
                if (name === "slot") {
                    this.slot = String(value);
                    continue;
                }
                if (name === "effect") {
                    this.effects.push(String(value));
                    continue;
                }
                //It's not slot name nor effect, so it's a stat modifier
                this.modifiers[name] = Number(value);
            }
        }

        this.name = name;

        //Since you can't save object type to JSON, this has to do (just in case)
        this.type = "item";
    }
}

class Stat {
    level: number;
    experience?: number;
    expToNextLvl?: number;
    type: "character" | "item" | "stat";
    [key: string]: number | string | (() => string);

    constructor(name: string, level?: number) {
        if (!isInStats(name)) {
            state.stats.push(name);
        }
        this.level = level ?? state.startingLevel;
        if (levellingToOblivion) {
            this.experience = 0;
            this.expToNextLvl = 2 * this.level;
        }
        this.type = "stat";
    }

    toString() {
        return levellingToOblivion || !(this.expToNextLvl && this.experience)
            ? String(this.level)
            : `level = ${this.level} exp = ${this.experience} exp to lvl up=${this.expToNextLvl
            }(${this.expToNextLvl - this.experience})`;
    }
}

class Character {
    //Type declarations
    hp: number = 100;
    level: number = 1;
    experience: number = 0;
    expToNextLvl: number = 2;
    skillpoints: number = 0;
    items: { [key: string]: Item } = {};
    type: "character" | "item" | "stat" = "character";
    isNpc: boolean = false;
    stats: { [key: string]: Stat } = {};
    // Marked as possibly undefined for backwards compatibility
    activeEffects?: Effect[] = [];
    [key: string]:
    | number
    | boolean
    | "character"
    | "item"
    | "stat"
    | Effect[]
    | (() => string)
    | { [key: string]: Item }
    | { [key: string]: Stat };

}

const isInStats = (name: string): boolean => {
    return state.stats.indexOf(name) > -1;
};

let state: {
    //Options
    stats: string[];
    dice: number;
    startingLevel: number;
    startingHP: number;
    punishment: number;
    skillpointsOnLevelUp: number;
    runEffectsOutsideBattle: boolean;

    //Data
    inventory: string[];
    items: { [key: string]: Item };
    characters: { [key: string]: Character };
    effects: { [key: string]: Effect };
    seenOutput: boolean;

    //Used in modifiers other than Input
    in: string;
    ctxt: string;
    out: string;
    message?: string | { text: string; stop: boolean }[];

    //Battle related
    inBattle: boolean;
    side1?: string[];
    side2?: string[];
    active?: string[];
    currentSide?: string;
    activeCharacterName?: string;
    activeCharacter?: Character;

    //Just so there won't be errors when accessing by [] op
    [key: string]: any;
} = {
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
const defaultState = copy(state);

let levellingToOblivion = true;
const stateKeys = Object.keys(state);

const RecursiveTypeCheck = (originalObject: { [key: string]: any } | any, comparedObject: { [key: string]: any } | any, comparedObjectName: string): boolean | string[] => {
    if (typeof comparedObject !== typeof originalObject)
        return [`${comparedObjectName} is of incorrect type (${typeof comparedObject} instead of ${typeof originalObject})`];

    if (typeof comparedObject !== "object")
        return true;

    let errors: string[] = [];
    for (const key in comparedObject) {
        const temp = RecursiveTypeCheck(originalObject[key], comparedObject[key], `${comparedObjectName}: ${key}`);
        if (typeof temp !== "boolean")
            errors.concat(temp);

    }

    return errors.length > 0 ? errors : true;
}

const ParseState = (state_text: string): void | string[] => {

    let tempState: { [key: string]: any } = {};

    let errors: Array<string> = [];

    try {
        tempState = JSON.parse(state_text.replace("\n", ""))

    } catch (SyntaxError) {
        errors.push("JSON state invalid");

    }

    const checkOutput = RecursiveTypeCheck(state, tempState, "state");

    if (typeof checkOutput !== "boolean")
        errors.concat(checkOutput);

    if (errors.length === 0) {
        for (const key in tempState) {
            if (Object.prototype.hasOwnProperty.call(tempState, key)) {
                state[key] = tempState[key];
            }
        }
        UpdateFields();
    }
    else return errors;
}

const UpdateFields = (): void => {
    (document.getElementById("dice") as HTMLInputElement).value = String(state.dice);
    (document.getElementById("startingLevel") as HTMLInputElement).value = String(state.startingLevel);
    (document.getElementById("startingHP") as HTMLInputElement).value = String(state.startingHP);
    (document.getElementById("skillpointsOnLevelUp") as HTMLInputElement).value = String(state.skillpointsOnLevelUp);
    (document.getElementById("punishment") as HTMLInputElement).value = String(state.punishment);
    (document.getElementById("inBattle") as HTMLInputElement).checked = state.inBattle;
    (document.getElementById("in") as HTMLTextAreaElement).value = String(state.in);
    (document.getElementById("ctxt") as HTMLTextAreaElement).value = String(state.ctxt);
    (document.getElementById("out") as HTMLTextAreaElement).value = String(state.out);

    if (state.stats.length == 0)
        (document.getElementById("stats") as HTMLDivElement).innerHTML = "";

    if (state.inventory.length == 0)
        (document.getElementById("inventory") as HTMLDivElement).innerHTML = "";

    if (!state.side1 || state.side1.length == 0)
        (document.getElementById("side1") as HTMLDivElement).innerHTML = "";

    if (!state.side2 || state.side2.length == 0)
        (document.getElementById("side2") as HTMLDivElement).innerHTML = "";

    if (!state.active || state.active.length == 0)
        (document.getElementById("active") as HTMLDivElement).innerHTML = "";

}

const main = () => {
    const error_place = document.getElementById("errors") as HTMLParagraphElement;

    const state_text = document.getElementById("state_text") as HTMLTextAreaElement;
    if (!state_text)
        error_place.innerHTML = "State text could not be retrieved.";
    state_text.onkeydown = (key: KeyboardEvent): any => {
        if (key.code === "Enter" && key.ctrlKey) (document.getElementById("serialize") as HTMLButtonElement).click();
    }

    (document.getElementById("add_stat") as HTMLButtonElement).onclick = () => {
        const statsDiv = document.getElementById("stats") as HTMLDivElement;
        const new_stat = (document.getElementById("new_stat") as HTMLInputElement).value.trim();
        state.stats.push(new_stat);
        statsDiv.innerHTML += `\n<div class="single_value" id="stat_${state.stats.length}">
        <p>${state.stats[state.stats.length - 1]}</p>
</div>`;
    }

    (document.getElementById("add_item_inventory") as HTMLButtonElement).onclick = () => {
        const inventoryDiv = document.getElementById("inventory") as HTMLDivElement;
        const index = inventoryDiv.childElementCount;
        inventoryDiv.innerHTML += `\n<div class="single_value">
        <select id="inventory_item_${index}"><option value="A">A</option><option value="B">B</option>`;
        for (const itemName in state.items)
            inventoryDiv.innerHTML += `<option value="${itemName}">${itemName}</option>`;
        inventoryDiv.innerHTML += "</select></div>";
        state.inventory[index] = ((document.getElementById(`inventory_item_${index}`) as HTMLSelectElement).firstChild as HTMLOptionElement).value;

        (document.getElementById(`inventory_item_${index}`) as HTMLSelectElement).onchange = () => {
            state.inventory[index] = (document.getElementById(`inventory_item_${index}`) as HTMLSelectElement).value;
        };

    }
    (document.getElementById("add_character_side1") as HTMLButtonElement).onclick = () => {
        const side1Div = document.getElementById("side1") as HTMLDivElement;
        side1Div.innerHTML += `\n<div class="single_value"></div>`;
        state.side1 ??= [];
        state.inBattle = true;
    }
    (document.getElementById("add_character_side2") as HTMLButtonElement).onclick = () => {
        const side2Div = document.getElementById("side2") as HTMLDivElement;
        side2Div.innerHTML += `\n<div class="single_value"></div>`;
        state.side2 ??= [];
        state.inBattle = true;
    }
    (document.getElementById("add_character_active") as HTMLButtonElement).onclick = () => {
        const activeDiv = document.getElementById("active") as HTMLDivElement;
        activeDiv.innerHTML += `\n<div class="single_value"></div>`;
        state.active = [];
        state.inBattle = true;
    }

    (document.getElementById("state_default") as HTMLButtonElement).onclick = () => {
        state = copy(defaultState);
        state_text.value = JSON.stringify(state);
        UpdateFields();
    };

    (document.getElementById("serialize") as HTMLButtonElement).onclick = () => ParseState(state_text.value);
    (document.getElementById("deserialize") as HTMLButtonElement).onclick = () => state_text.value = JSON.stringify(state);
    UpdateFields();
};

try {
    main();
} catch (error) {
    let message = error instanceof Error ? error.message : JSON.stringify(error);
    (document.getElementById("errors") as HTMLParagraphElement).innerHTML = message;
}
