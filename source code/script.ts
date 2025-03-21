function copy(aObject: any): any {
    // Prevent undefined objects
    // if (!aObject) return aObject;

    let bObject: Array<any> | { [key: string | number]: any } = Array.isArray(
        aObject
    )
        ? []
        : {};

    let value: any, key: any;
    for (key in aObject) {
        // Prevent self-references to parent object
        // if (Object.is(aObject[key], aObject)) continue;

        value = aObject[key];

        bObject[key] = typeof value === "object" ? copy(value) : value;
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
            : `level = ${this.level} exp = ${this.experience} exp to lvl up=${
                  this.expToNextLvl
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
    out: "\nState was set correctly. State created with AID State Creator.",
    message: "",
    inBattle: false,
};
const defaultState = copy(state);

const stateKeys = Object.keys(state);

const RecursiveTypeCheck = (
    originalObject: { [key: string]: any } | any,
    comparedObject: { [key: string]: any } | any,
    comparedObjectName: string
): boolean | string[] => {
    if (typeof comparedObject !== typeof originalObject)
        return [
            `${comparedObjectName} is of incorrect type (${typeof comparedObject} instead of ${typeof originalObject})`,
        ];

    if (typeof comparedObject !== "object") return true;

    let errors: string[] = [];
    for (const key in comparedObject) {
        const temp = RecursiveTypeCheck(
            originalObject[key],
            comparedObject[key],
            `${comparedObjectName}: ${key}`
        );
        if (typeof temp !== "boolean") errors.concat(temp);
    }

    return errors.length > 0 ? errors : true;
};

let slots: Array<string> = [];
let itemsBySlot: { [key: string]: string[] } = {};

const ParseState = (state_text: string): void | string[] => {
    let tempState: { [key: string]: any } = {};

    let errors: Array<string> = [];

    try {
        tempState = JSON.parse(state_text.replace("\n", ""));
    } catch (SyntaxError) {
        errors.push("JSON state invalid");
        return;
    }

    const checkOutput = RecursiveTypeCheck(state, tempState, "state");

    if (typeof checkOutput !== "boolean") errors.concat(checkOutput);

    if (errors.length === 0) {
        for (const key in tempState) {
            if (Object.prototype.hasOwnProperty.call(tempState, key)) {
                state[key] = tempState[key];
            }
        }
        itemsBySlot = {};
        UpdateFields();
    } else return errors;
};

let t = false;

const UpdateFields = (): void => {
    console.log("updating fields");
    slots = [];

    console.log("dice");

    (document.getElementById("dice") as HTMLInputElement).value = String(
        state.dice
    );

    console.log("starting level");

    (document.getElementById("startingLevel") as HTMLInputElement).value =
        String(state.startingLevel);

    console.log("starting hp");

    (document.getElementById("startingHP") as HTMLInputElement).value = String(
        state.startingHP
    );

    console.log("skillpoints on lvl up");

    (
        document.getElementById("skillpointsOnLevelUp") as HTMLInputElement
    ).value = String(state.skillpointsOnLevelUp);

    console.log("punishment");

    (document.getElementById("punishment") as HTMLInputElement).value = String(
        state.punishment
    );

    console.log("in battle");

    (document.getElementById("inBattle") as HTMLInputElement).checked =
        state.inBattle;

    console.log("effects outside battle");

    (
        document.getElementById("effectsOutsideBattle") as HTMLInputElement
    ).checked = state.runEffectsOutsideBattle;

    console.log("in");

    (document.getElementById("in") as HTMLTextAreaElement).value = String(
        state.in
    );

    console.log("ctxt");

    (document.getElementById("ctxt") as HTMLTextAreaElement).value = String(
        state.ctxt
    );

    console.log("out");

    (document.getElementById("out") as HTMLTextAreaElement).value = String(
        state.out
    );

    console.log("slots");

    (document.getElementById("slots") as HTMLDivElement).innerHTML = "";
    {
        const slotsDiv = document.getElementById("slots") as HTMLDivElement;
        for (const item of Object.values(state.items)) {
            if (!slots.includes(item.slot)) {
                slots.push(item.slot);

                const newDiv = document.createElement("div");
                newDiv.className = "single_value";

                const inputElement = document.createElement("input");
                inputElement.value = item.slot;

                let previousValue = inputElement.value;
                inputElement.onchange = () => {
                    slots[slots.indexOf(previousValue)] = inputElement.value;

                    for (const element of Array.from(
                        document.getElementsByClassName("slot-select")
                    )) {
                        const selectElement = element as HTMLSelectElement;
                        for (const option of Array.from(
                            selectElement.options
                        )) {
                            if (option.value === previousValue) {
                                option.value = inputElement.value;
                                option.text = inputElement.value;
                            }
                        }
                    }

                    for (const element of Array.from(
                        document.getElementsByClassName(
                            `slot-name-${previousValue}`
                        )
                    )) {
                        (element as HTMLParagraphElement).innerText =
                            inputElement.value;
                        element.className = `slot-name-${inputElement.value}`;
                    }

                    previousValue = inputElement.value;
                };
                newDiv.appendChild(inputElement);

                for (const element of Array.from(
                    document.getElementsByClassName("equipment-list")
                )) {
                    const equipment = element as HTMLUListElement;
                    const slotElement = document.createElement("li");

                    const slotName = document.createElement("p");
                    slotName.innerText = item.slot;
                    slotElement.appendChild(slotName);

                    const equippedItem = document.createElement("select");
                    equippedItem.className = `item-${item.slot}-select item-slot-select`;
                    itemsBySlot[item.slot] ??= [];
                    for (const itemName of itemsBySlot[item.slot]) {
                        const option = document.createElement("option");
                        option.text = option.value = itemName;
                        equippedItem.appendChild(option);
                    }
                    const characterName: string | null | undefined =
                        element.id.match(/([\w\s ']+)-equipment/)?.groups?.[0];
                    if (!characterName) {
                        console.error(
                            "slot parse: character's name could not be found"
                        );

                        continue;
                    }
                    equippedItem.onchange = () => {
                        if (equippedItem.value === "None")
                            delete state.characters[characterName].items[
                                item.slot
                            ];
                        else
                            state.characters[characterName].items[item.slot] =
                                state.items[equippedItem.value];
                    };
                    slotElement.appendChild(equippedItem);

                    equipment.appendChild(slotElement);
                }

                const deleteSlot = document.createElement("button");
                deleteSlot.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
          </svg>`;
                deleteSlot.onclick = () => {
                    for (const element of Array.from(
                        document.getElementsByClassName("slot-select")
                    )) {
                        const select = element as HTMLSelectElement;

                        for (const option of Array.from(select.options)) {
                            if (option.value === item.slot) {
                                select.removeChild(option);
                                break;
                            }
                        }
                    }

                    for (const element of Array.from(
                        document.getElementsByClassName(
                            `item-${item.slot}-select`
                        )
                    )) {
                        element.parentElement?.remove();
                    }

                    newDiv.remove();
                    slots.splice(slots.indexOf(inputElement.value), 1);
                };
                newDiv.appendChild(deleteSlot);

                slotsDiv.appendChild(newDiv);
            }
        }
    }

    console.log("stats");

    (document.getElementById("stats") as HTMLDivElement).innerHTML = "";
    {
        const statsDiv = document.getElementById("stats") as HTMLDivElement;
        for (const stat of state.stats) {
            const newStat = stat;

            const newDiv = document.createElement("div");
            newDiv.className = "single_value";

            const inputElement = document.createElement("input");
            inputElement.value = stat;
            inputElement.onchange = () => {
                state.stats[state.stats.indexOf(stat)] = inputElement.value;
            };
            newDiv.appendChild(inputElement);

            for (const element of Array.from(
                document.getElementsByClassName("stat-select")
            )) {
                const select = element as HTMLSelectElement;

                const option = document.createElement("option");
                option.text = option.value = newStat;
                select.appendChild(option);
            }

            const deleteStat = document.createElement("button");
            deleteStat.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
            deleteStat.onclick = () => {
                for (const element of Array.from(
                    document.getElementsByClassName("stat-select")
                )) {
                    const select = element as HTMLSelectElement;

                    for (const option of Array.from(select.options)) {
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
        }
    }

    console.log("inventory");

    (document.getElementById("inventory") as HTMLDivElement).innerHTML = "";
    {
        const inventoryDiv = document.getElementById(
            "inventory"
        ) as HTMLDivElement;
        for (const inventoryItemName of state.inventory) {
            const newDiv = document.createElement("div");
            newDiv.className = "single_value";

            const newSelect = document.createElement("select");
            newSelect.className = "item-select";

            for (const itemName in state.items) {
                const option = document.createElement("option");
                option.value = option.innerText = itemName;
                newSelect.appendChild(option);
            }
            newSelect.value = inventoryItemName;

            newDiv.appendChild(newSelect);

            const deleteItem = document.createElement("button");
            deleteItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
    </svg>`;
            deleteItem.onclick = () => {
                newDiv.remove();
                state.inventory.splice(
                    state.inventory.indexOf(newSelect.value),
                    1
                );
            };
            newDiv.appendChild(deleteItem);

            inventoryDiv.appendChild(newDiv);
            let previousValue = newSelect.value;
            newSelect.onchange = () => {
                state.inventory[state.inventory.indexOf(previousValue)] =
                    newSelect.value;
                previousValue = newSelect.value;
            };
        }
    }

    console.log("side1");

    (document.getElementById("side1") as HTMLDivElement).innerHTML = "";
    {
        state.side1 ??= [];
        const side1Div = document.getElementById("side1") as HTMLDivElement;
        for (const characterName of state.side1) {
            const newDiv = document.createElement("div");
            newDiv.className = "single_value";

            const characterSelect = document.getElementById(
                "new_character_side1"
            ) as HTMLSelectElement;

            let selectedOption = characterSelect.selectedOptions[0];
            for (const option of Array.from(characterSelect.options)) {
                if (option.value === characterName) {
                    selectedOption = option;
                    characterSelect.removeChild(selectedOption);
                    break;
                }
            }

            state.side1.push(characterName);

            const characterParagraph = document.createElement("p");
            characterParagraph.innerText = characterName;

            newDiv.appendChild(characterParagraph);

            const deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
            deleteCharacter.onclick = () => {
                newDiv.remove();
                state.side1?.splice(state.side1?.indexOf(characterName), 1);
                if (
                    Object.keys(state.characters).includes(selectedOption.value)
                )
                    characterSelect.appendChild(selectedOption);
            };
            newDiv.appendChild(deleteCharacter);

            side1Div.appendChild(newDiv);
        }
    }

    console.log("side2");

    (document.getElementById("side2") as HTMLDivElement).innerHTML = "";
    {
        state.side2 ??= [];
        const side2Div = document.getElementById("side2") as HTMLDivElement;
        for (const characterName of state.side2) {
            const newDiv = document.createElement("div");
            newDiv.className = "single_value";

            const characterSelect = document.getElementById(
                "new_character_side2"
            ) as HTMLSelectElement;

            let selectedOption = characterSelect.selectedOptions[0];
            for (const option of Array.from(characterSelect.options)) {
                if (option.value === characterName) {
                    selectedOption = option;
                    characterSelect.removeChild(selectedOption);
                    break;
                }
            }

            state.side2.push(characterName);

            const characterParagraph = document.createElement("p");
            characterParagraph.innerText = characterName;

            newDiv.appendChild(characterParagraph);

            const deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>`;
            deleteCharacter.onclick = () => {
                newDiv.remove();
                state.side2?.splice(state.side2?.indexOf(characterName), 1);
                if (
                    Object.keys(state.characters).includes(selectedOption.value)
                )
                    characterSelect.appendChild(selectedOption);
            };
            newDiv.appendChild(deleteCharacter);

            side2Div.appendChild(newDiv);
        }
    }

    console.log("active");

    (document.getElementById("active") as HTMLDivElement).innerHTML = "";
    {
        state.active ??= [];
        const activeDiv = document.getElementById("active") as HTMLDivElement;

        for (const characterName of state.active) {
            const newDiv = document.createElement("div");
            newDiv.className = "single_value";

            const characterSelect = document.getElementById(
                "new_character_active"
            ) as HTMLSelectElement;

            let selectedOption: HTMLOptionElement;
            for (const option of Array.from(characterSelect.options)) {
                if (option.value === characterName) {
                    selectedOption = option;
                    characterSelect.removeChild(option);
                    break;
                }
            }

            const characterParagraph = document.createElement("p");
            characterParagraph.innerText = characterName;

            newDiv.appendChild(characterParagraph);

            const deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
          </svg>`;
            deleteCharacter.onclick = () => {
                newDiv.remove();
                state.active?.splice(state.active?.indexOf(characterName), 1);
                if (
                    Object.keys(state.characters).includes(selectedOption.value)
                )
                    characterSelect.appendChild(selectedOption);
            };
            newDiv.appendChild(deleteCharacter);

            activeDiv.appendChild(newDiv);
        }
    }

    console.log("characters");

    (document.getElementById("characters") as HTMLDivElement).innerHTML = "";
    {
        const charactersDiv = document.getElementById(
            "characters"
        ) as HTMLDivElement;
        for (const characterName of Object.keys(state.characters)) {
            const character = state.characters[characterName];

            const newCharacter = document.createElement("div");
            newCharacter.className = "character";

            const characterSheet = document.createElement("ul");
            characterSheet.className = "character-sheet";

            const nameElement = document.createElement("li");
            const nameParagraph = document.createElement("p");
            nameParagraph.innerText = characterName;
            nameElement.appendChild(nameParagraph);
            characterSheet.appendChild(nameElement);

            const levelElement = document.createElement("li");
            const levelParagraph = document.createElement("p");
            levelParagraph.innerText = "Level: ";
            const levelInput = document.createElement("input");
            levelInput.type = "number";
            levelInput.value = String(state.characters[characterName].level);
            levelInput.onchange = () => {
                state.characters[characterName].level =
                    levelInput.valueAsNumber;
            };
            levelElement.appendChild(levelParagraph);
            levelElement.appendChild(levelInput);
            characterSheet.appendChild(levelElement);

            const experienceElement = document.createElement("li");
            const experienceParagraph = document.createElement("p");
            experienceParagraph.innerText = "Experience: ";
            const experienceInput = document.createElement("input");
            experienceInput.type = "number";
            experienceInput.value = String(
                state.characters[characterName].experience
            );
            experienceInput.onchange = () => {
                state.characters[characterName].experience =
                    experienceInput.valueAsNumber;
            };
            experienceElement.appendChild(experienceParagraph);
            experienceElement.appendChild(experienceInput);
            characterSheet.appendChild(experienceElement);

            const expToNextLvlElement = document.createElement("li");
            const expToNextLvlParagraph = document.createElement("p");
            expToNextLvlParagraph.innerText = "Experience to next level: ";
            const expToNextLvlInput = document.createElement("input");
            expToNextLvlInput.type = "number";
            expToNextLvlInput.value = String(
                state.characters[characterName].expToNextLvl
            );
            expToNextLvlInput.onchange = () => {
                state.characters[characterName].expToNextLvl =
                    expToNextLvlInput.valueAsNumber;
            };
            expToNextLvlElement.appendChild(expToNextLvlParagraph);
            expToNextLvlElement.appendChild(expToNextLvlInput);
            characterSheet.appendChild(expToNextLvlElement);

            const skillpointsElement = document.createElement("li");
            const skillpointsParagraph = document.createElement("p");
            skillpointsParagraph.innerText = "Skillpoints:";
            const skillpointsInput = document.createElement("input");
            skillpointsInput.type = "number";
            skillpointsInput.value = String(
                state.characters[characterName].skillpoints
            );
            skillpointsInput.onchange = () => {
                state.characters[characterName].skillpoints =
                    skillpointsInput.valueAsNumber;
            };
            skillpointsElement.appendChild(skillpointsParagraph);
            skillpointsElement.appendChild(skillpointsInput);
            characterSheet.appendChild(skillpointsElement);

            const modifiersParagraph = document.createElement("p");
            modifiersParagraph.innerText = "Stats:";
            characterSheet.appendChild(modifiersParagraph);

            const modifierRefCount: { [key: string]: number } = {};
            const modifiersElement = document.createElement("ul");
            modifiersElement.style.listStyleType = "none";
            const modifierAddElement = document.createElement("li");
            const modifierAdd = document.createElement("button");
            modifierAdd.innerText = "Add stat";
            modifierAdd.onclick = () => {
                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                let selected = false;
                let i = 0;
                for (const stat of state.stats) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (
                        !Object.keys(
                            state.characters[characterName].stats
                        ).includes(stat) &&
                        !selected
                    ) {
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
                    alert(
                        "All of the created stats have been used for this character, create a new stat or modify already existing modifier"
                    );
                    modifiedStat.remove();
                    newModifier.remove();
                    return;
                }

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ]
                    ) {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ].level += modifiedValue.valueAsNumber;
                    } else {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ] = new Stat(
                            modifiedStat.value,
                            modifiedValue.valueAsNumber
                        );
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (
                        state.characters[characterName].stats[previousStatName]
                    ) {
                        state.characters[characterName].stats[
                            previousStatName
                        ].level -= modifiedValue.valueAsNumber;
                    } else {
                        state.characters[characterName].stats[
                            previousStatName
                        ] = new Stat(previousStatName, 0);
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.characters[characterName].stats[
                            previousStatName
                        ];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                let previousValue: number = modifiedValue.valueAsNumber;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (
                        !state.characters[characterName].stats[
                            modifiedStat.value
                        ]
                    ) {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ] = new Stat(
                            modifiedStat.value,
                            modifiedValue.valueAsNumber
                        );
                    } else {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ].level += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
                deleteModifier.onclick = () => {
                    state.characters[characterName].stats[
                        modifiedStat.value
                    ].level -= modifiedValue.valueAsNumber;
                    if (
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ].level == 0
                    )
                        delete state.characters[characterName].stats[
                            modifiedStat.value
                        ];
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            for (const statName of Object.keys(character.stats)) {
                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";

                for (const stat of state.stats) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                }

                modifiedStat.value = statName;

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ]
                    ) {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ].level += modifiedValue.valueAsNumber;
                    } else {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ] = new Stat(
                            modifiedStat.value,
                            modifiedValue.valueAsNumber
                        );
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (
                        state.characters[characterName].stats[previousStatName]
                    ) {
                        state.characters[characterName].stats[
                            previousStatName
                        ].level -= modifiedValue.valueAsNumber;
                    } else {
                        state.characters[characterName].stats[
                            previousStatName
                        ] = new Stat(previousStatName, 0);
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.characters[characterName].stats[
                            previousStatName
                        ];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value =
                    character.stats[statName].level.toString();
                let previousValue: number = modifiedValue.valueAsNumber;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (
                        !state.characters[characterName].stats[
                            modifiedStat.value
                        ]
                    ) {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ] = new Stat(
                            modifiedStat.value,
                            modifiedValue.valueAsNumber
                        );
                    } else {
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ].level += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
                deleteModifier.onclick = () => {
                    state.characters[characterName].stats[
                        modifiedStat.value
                    ].level -= modifiedValue.valueAsNumber;
                    if (
                        state.characters[characterName].stats[
                            modifiedStat.value
                        ].level == 0
                    )
                        delete state.characters[characterName].stats[
                            modifiedStat.value
                        ];
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            }
            characterSheet.appendChild(modifiersElement);

            const equipmentElement = document.createElement("li");
            const equipmentParagraph = document.createElement("p");
            equipmentParagraph.innerText = "Equipment:";
            equipmentElement.appendChild(equipmentParagraph);

            const equipment = document.createElement("ul");
            equipment.className = "equipment-list";
            equipment.id = `${characterName.replace(" ", "-")}-equipment`;
            for (const slot of slots) {
                const slotElement = document.createElement("li");

                const slotName = document.createElement("p");
                slotName.innerText = slot;
                slotName.className = `slot-name-${slot}`;
                slotElement.appendChild(slotName);

                const equippedItem = document.createElement("select");
                equippedItem.className = `item-${slot}-select item-slot-select`;
                itemsBySlot[slot] ??= [];
                for (const itemName of itemsBySlot[slot]) {
                    const option = document.createElement("option");
                    option.text = option.value = itemName;
                    equippedItem.appendChild(option);
                }
                const option = document.createElement("option");
                option.text = option.value = "None";
                equippedItem.appendChild(option);

                equippedItem.value = "None";

                if (character.items[slot])
                    equippedItem.value = character.items[slot].name;

                equippedItem.onchange = () => {
                    if (equippedItem.value === "None")
                        delete state.characters[characterName].items[slot];
                    else
                        state.characters[characterName].items[slot] =
                            state.items[equippedItem.value];
                };

                slotElement.appendChild(equippedItem);

                equipment.appendChild(slotElement);
            }
            equipmentElement.appendChild(equipment);
            characterSheet.appendChild(equipmentElement);

            const effectsElement = document.createElement("li");
            const effectsParagraph = document.createElement("p");
            effectsParagraph.innerText = "Effects:";
            effectsElement.appendChild(effectsParagraph);
            const effects = document.createElement("div");
            effects.className = "list";
            effectsElement.appendChild(effects);

            const effectAddInput = document.createElement("select");
            effectAddInput.className = "effect-select";
            for (const effectName in state.effects) {
                const option = document.createElement("option");
                option.value = option.innerText = effectName;
                effectAddInput.appendChild(option);
            }

            character.activeEffects ??= [];
            for (const effect of character.activeEffects) {
                const newElement = document.createElement("div");

                const newEffect = document.createElement("p");
                newEffect.innerText = effect.name;
                newElement.appendChild(newEffect);

                const deleteElement = document.createElement("button");
                deleteElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        </svg>`;

                let effectOption = effectAddInput.options[0];
                for (const option of Array.from(effectAddInput.options)) {
                    if (option.value === effect.name) {
                        effectOption = option;
                        break;
                    }
                }

                deleteElement.onclick = () => {
                    if (!character.activeEffects) {
                        console.error("Effects disappeared?!");

                        return;
                    }
                    character.activeEffects?.splice(
                        character.activeEffects?.indexOf(effect),
                        1
                    );
                    if (effectOption) effectAddInput.appendChild(effectOption);
                    newElement.remove();
                };

                newElement.appendChild(deleteElement);
                effects.appendChild(newElement);
                if (effectOption) effectAddInput.removeChild(effectOption);
            }

            const effectAddButton = document.createElement("button");
            effectAddButton.innerText = "+";

            effectAddButton.onclick = () => {
                if (!state.characters[characterName].activeEffects) {
                    state.characters[characterName].activeEffects = [];
                }
                const selectedOption = effectAddInput.selectedOptions[0];
                state.characters[characterName].activeEffects?.push(
                    state.effects[selectedOption.value]
                );

                const newElement = document.createElement("div");

                const newEffect = document.createElement("p");
                newEffect.innerText = selectedOption.value;
                newElement.appendChild(newEffect);

                state.characters[characterName].activeEffects?.push(
                    state.effects[effectAddInput.value]
                );

                const deleteElement = document.createElement("button");
                deleteElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        </svg>`;

                deleteElement.onclick = () => {
                    if (!state.characters[characterName].activeEffects) {
                        console.error("Effects disappeared?!");

                        return;
                    }
                    state.characters[characterName].activeEffects?.splice(
                        state.characters[characterName].activeEffects?.indexOf(
                            state.effects[selectedOption.value]
                        ) ?? 0,
                        1
                    );
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

            for (const element of Array.from(
                document.getElementsByClassName("character-select")
            )) {
                const select = element as HTMLSelectElement;

                const option = document.createElement("option");
                option.text = option.value = characterName;
                select.appendChild(option);
            }

            const deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
            deleteCharacter.onclick = () => {
                for (const element of Array.from(
                    document.getElementsByClassName("character-select")
                )) {
                    const select = element as HTMLSelectElement;

                    for (const option of Array.from(select.options)) {
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
        }
    }

    (document.getElementById("items") as HTMLDivElement).innerHTML = "";
    {
        const itemsDiv = document.getElementById("items") as HTMLDivElement;
        for (const itemName of Object.keys(state.items)) {
            console.log(itemName);
            const item = state.items[itemName];

            const newItem = document.createElement("div");
            newItem.className = "item";

            const itemSheet = document.createElement("ul");
            itemSheet.className = "item-sheet";

            const nameElement = document.createElement("li");
            const nameParagraph = document.createElement("p");
            nameParagraph.innerText = itemName;
            nameElement.appendChild(nameParagraph);
            itemSheet.appendChild(nameElement);

            const slotElement = document.createElement("li");
            const slotSelect = document.createElement("select");
            slotSelect.className = "slot-select";
            for (const slot of slots) {
                const option = document.createElement("option");
                option.text = option.value = slot;
                slotSelect.appendChild(option);
            }
            slotSelect.value = item.slot;

            if (!itemsBySlot[slotSelect.value]) {
                itemsBySlot[slotSelect.value] = [itemName];
            } else {
                itemsBySlot[slotSelect.value].push(itemName);
            }

            for (const element of Array.from(
                document.getElementsByClassName(
                    `item-${slotSelect.value}-select`
                )
            )) {
                const select = element as HTMLSelectElement;

                const option = document.createElement("option");
                option.text = option.value = itemName;
                select.appendChild(option);
            }

            let previousValue = slotSelect.value;
            slotSelect.onchange = () => {
                state.items[itemName].slot = slotSelect.value;

                if (!itemsBySlot[slotSelect.value]) {
                    itemsBySlot[slotSelect.value] = [itemName];
                } else {
                    itemsBySlot[slotSelect.value].push(itemName);
                }

                for (const element of Array.from(
                    document.getElementsByClassName(
                        `item-${slotSelect.value}-select`
                    )
                )) {
                    const select = element as HTMLSelectElement;

                    const option = document.createElement("option");
                    option.text = option.value = itemName;
                    select.appendChild(option);
                }

                itemsBySlot[previousValue].splice(
                    itemsBySlot[previousValue].indexOf(itemName),
                    1
                );

                for (const element of Array.from(
                    document.getElementsByClassName(
                        `item-${previousValue}-select`
                    )
                )) {
                    const select = element as HTMLSelectElement;

                    for (const option of Array.from(select.options)) {
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

            const effectsElement = document.createElement("li");
            const effects = document.createElement("div");
            effects.className = "list";
            for (const effectName of item.effects) {
                const newElement = document.createElement("div");

                const newEffect = document.createElement("p");
                newEffect.innerText = effectName;
                newElement.appendChild(newEffect);

                const deleteElement = document.createElement("button");
                deleteElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;

                deleteElement.onclick = () => {
                    state.items[itemName].effects.splice(
                        item.effects.indexOf(effectName),
                        1
                    );
                    const option = document.createElement("option");
                    option.text = option.value = effectName;
                    effectAddInput.appendChild(option);
                    newElement.remove();
                };

                newElement.appendChild(deleteElement);
                effects.appendChild(newElement);
            }
            effectsElement.appendChild(effects);

            const effectAddInput = document.createElement("select");
            effectAddInput.className = "effect-select";
            for (const effectName in state.effects) {
                if (item.effects.includes(effectName)) continue;

                const option = document.createElement("option");
                option.value = option.innerText = effectName;
                effectAddInput.appendChild(option);
            }

            const effectAddButton = document.createElement("button");
            effectAddButton.innerText = "+";

            effectAddButton.onclick = () => {
                const selectedOption = effectAddInput.selectedOptions[0];
                state.items[itemName].effects.push(selectedOption.value);

                const newElement = document.createElement("div");

                const newEffect = document.createElement("p");
                newEffect.innerText = selectedOption.value;
                newElement.appendChild(newEffect);

                const deleteElement = document.createElement("button");
                deleteElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;

                deleteElement.onclick = () => {
                    state.items[itemName].effects.splice(
                        item.effects.indexOf(selectedOption.value),
                        1
                    );
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

            const modifiersParagraph = document.createElement("p");
            modifiersParagraph.innerText = "Modifiers:";
            itemSheet.appendChild(modifiersParagraph);

            const modifierRefCount: { [key: string]: number } = {};
            const modifiersElement = document.createElement("ul");
            modifiersElement.style.listStyleType = "none";

            const modifierAddElement = document.createElement("li");
            const modifierAdd = document.createElement("button");
            modifierAdd.innerText = "Add modifier";
            modifierAdd.onclick = () => {
                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                let selected = false;
                let i = 0;
                for (const stat of state.stats) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (
                        !Object.keys(state.items[itemName].modifiers).includes(
                            stat
                        ) &&
                        !selected
                    ) {
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
                    alert(
                        "All of the created stats have been used for this item, create a new stat or modify already existing modifier"
                    );
                    modifiedStat.remove();
                    newModifier.remove();
                    return;
                }

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (
                        !isNaN(
                            state.items[itemName].modifiers[modifiedStat.value]
                        )
                    ) {
                        state.items[itemName].modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber;
                    } else {
                        state.items[itemName].modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (
                        !isNaN(
                            state.items[itemName].modifiers[previousStatName]
                        )
                    ) {
                        state.items[itemName].modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    } else {
                        state.items[itemName].modifiers[previousStatName] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.items[itemName].modifiers[
                            previousStatName
                        ];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                let previousValue: number;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (
                        isNaN(
                            state.items[itemName].modifiers[modifiedStat.value]
                        )
                    ) {
                        state.items[itemName].modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    } else {
                        state.items[itemName].modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
                deleteModifier.onclick = () => {
                    state.items[itemName].modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.items[itemName].modifiers[
                            previousStatName
                        ];
                    }
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);

            for (const modifierName of Object.keys(item.modifiers)) {
                const modifierValue = item.modifiers[modifierName];

                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                for (const stat of state.stats.concat(["hp"])) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                }
                modifiedStat.value = modifierName;

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (!isNaN(item.modifiers[modifiedStat.value])) {
                        item.modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber;
                    } else {
                        item.modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (!isNaN(item.modifiers[previousStatName])) {
                        item.modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    } else {
                        item.modifiers[previousStatName] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete item.modifiers[previousStatName];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = modifierValue.toString();
                let previousValue: number;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (isNaN(item.modifiers[modifiedStat.value])) {
                        item.modifiers[modifiedStat.value] =
                            modifiedValue.valueAsNumber;
                    } else {
                        item.modifiers[modifiedStat.value] +=
                            modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
                deleteModifier.onclick = () => {
                    item.modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            }

            itemSheet.appendChild(modifiersElement);
            newItem.appendChild(itemSheet);

            const deleteItem = document.createElement("button");
            deleteItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
            deleteItem.onclick = () => {
                for (const element of Array.from(
                    document.getElementsByClassName("item-select")
                )) {
                    const select = element as HTMLSelectElement;

                    for (const option of Array.from(select.options)) {
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
        }
    }

    if (t) {
        console.log(state);
        return;
    }

    console.log("effects");

    (document.getElementById("effects") as HTMLDivElement).innerHTML = "";
    {
        const effectsDiv = document.getElementById("effects") as HTMLDivElement;

        for (const effectName of Object.keys(state.effects)) {
            const newEffect = document.createElement("div");
            const effectSheet = document.createElement("ul");
            effectSheet.className = "effect-sheet";

            const nameElement = document.createElement("li");
            const nameParagraph = document.createElement("p");
            nameParagraph.innerText = effectName;
            nameElement.appendChild(nameParagraph);
            effectSheet.appendChild(nameElement);

            const baseDurationElement = document.createElement("li");
            const baseDurationParagraph = document.createElement("p");
            baseDurationParagraph.innerText = "Base duration: ";
            baseDurationElement.appendChild(baseDurationParagraph);
            const baseDurationInput = document.createElement("input");
            baseDurationInput.type = "number";
            baseDurationInput.value =
                state.effects[effectName].baseDuration.toString();
            baseDurationInput.onchange = () => {
                state.effects[effectName].baseDuration = state.effects[
                    effectName
                ].durationLeft = baseDurationInput.valueAsNumber;
            };
            baseDurationElement.appendChild(baseDurationInput);
            effectSheet.appendChild(baseDurationElement);

            const applyUniqueElement = document.createElement("li");
            const applyUniqueParagraph = document.createElement("p");
            applyUniqueParagraph.innerText = "Apply unique: ";
            applyUniqueElement.appendChild(applyUniqueParagraph);
            const applyUniqueInput = document.createElement("input");
            applyUniqueInput.type = "checkbox";
            applyUniqueInput.checked = state.effects[effectName].applyUnique;
            applyUniqueInput.onchange = () => {
                state.effects[effectName].applyUnique =
                    applyUniqueInput.checked;
            };
            applyUniqueElement.appendChild(applyUniqueInput);
            effectSheet.appendChild(applyUniqueElement);

            const appliedOnElement = document.createElement("li");
            const appliedOnParagraph = document.createElement("p");
            appliedOnParagraph.innerText = "Applied on: ";
            appliedOnElement.appendChild(appliedOnParagraph);
            const appliedOnInput = document.createElement("select");
            for (const option of [
                "attack",
                "defense",
                "battle start",
                "not applied",
            ]) {
                const appliedOnOption = document.createElement("option");
                appliedOnOption.innerText = appliedOnOption.value = option;
                appliedOnInput.appendChild(appliedOnOption);
            }
            appliedOnInput.value = state.effects[effectName].appliedOn;
            appliedOnInput.onchange = () => {
                switch (appliedOnInput.value) {
                    case "attack":
                    case "defense":
                    case "battle start":
                    case "not applied":
                        state.effects[effectName].appliedOn =
                            appliedOnInput.value;
                        break;
                    default:
                        (
                            document.getElementById(
                                "errors"
                            ) as HTMLParagraphElement
                        ).innerHTML = "appliedOn invalid";
                }
            };
            appliedOnElement.appendChild(appliedOnInput);
            effectSheet.appendChild(appliedOnElement);

            const appliedToElement = document.createElement("li");
            const appliedToParagraph = document.createElement("p");
            appliedToParagraph.innerText = "Applied to: ";
            appliedToElement.appendChild(appliedToParagraph);
            const appliedToInput = document.createElement("select");
            for (const option of ["enemy", "self"]) {
                const appliedToOption = document.createElement("option");
                appliedToOption.innerText = appliedToOption.value = option;
                appliedToInput.appendChild(appliedToOption);
            }
            appliedToInput.value = state.effects[effectName].appliedTo;
            appliedToInput.onchange = () => {
                switch (appliedToInput.value) {
                    case "self":
                    case "enemy":
                        state.effects[effectName].appliedTo =
                            appliedToInput.value;
                        break;
                    default:
                        (
                            document.getElementById(
                                "errors"
                            ) as HTMLParagraphElement
                        ).innerHTML = "appliedTo invalid";
                }
            };
            appliedToElement.appendChild(appliedToInput);
            effectSheet.appendChild(appliedToElement);

            const impactElement = document.createElement("li");
            const impactParagraph = document.createElement("p");
            impactParagraph.innerText = "Impact: ";
            impactElement.appendChild(impactParagraph);
            const impactInput = document.createElement("select");
            for (const option of ["on end", "continuous", "every turn"]) {
                const impactOption = document.createElement("option");
                impactOption.innerText = impactOption.value = option;
                impactInput.appendChild(impactOption);
            }
            impactInput.value = state.effects[effectName].impact;
            impactInput.onchange = () => {
                switch (impactInput.value) {
                    case "on end":
                    case "continuous":
                    case "every turn":
                        state.effects[effectName].impact = impactInput.value;
                        break;
                    default:
                        (
                            document.getElementById(
                                "errors"
                            ) as HTMLParagraphElement
                        ).innerHTML = "impact invalid";
                }
            };
            impactElement.appendChild(impactInput);
            effectSheet.appendChild(impactElement);

            const modifiersParagraph = document.createElement("p");
            modifiersParagraph.innerText = "Modifiers:";
            effectSheet.appendChild(modifiersParagraph);

            const modifierRefCount: { [key: string]: number } = {};
            const modifiersElement = document.createElement("ul");
            modifiersElement.style.listStyleType = "none";

            const modifierAddElement = document.createElement("li");
            const modifierAdd = document.createElement("button");
            modifierAdd.innerText = "Add modifier";
            modifierAdd.onclick = () => {
                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                let selected = false;
                let i = 0;
                for (const stat of state.stats.concat(["hp"])) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (
                        !Object.keys(
                            state.effects[effectName].modifiers
                        ).includes(stat) &&
                        !selected
                    ) {
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
                    alert(
                        "All of the created stats have been used for this effect, create a new stat or modify already existing modifier"
                    );
                    modifiedStat.remove();
                    newModifier.remove();
                    return;
                }

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (
                        !isNaN(
                            state.effects[effectName].modifiers[
                                modifiedStat.value
                            ]
                        )
                    ) {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] += modifiedValue.valueAsNumber;
                    } else {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] = modifiedValue.valueAsNumber;
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (
                        !isNaN(
                            state.effects[effectName].modifiers[
                                previousStatName
                            ]
                        )
                    ) {
                        state.effects[effectName].modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    } else {
                        state.effects[effectName].modifiers[
                            previousStatName
                        ] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.effects[effectName].modifiers[
                            previousStatName
                        ];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                let previousValue: number;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (
                        isNaN(
                            state.effects[effectName].modifiers[
                                modifiedStat.value
                            ]
                        )
                    ) {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] = modifiedValue.valueAsNumber;
                    } else {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
                deleteModifier.onclick = () => {
                    state.effects[effectName].modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);

            for (const modifierName of Object.keys(
                state.effects[effectName].modifiers
            )) {
                const modifierValue =
                    state.effects[effectName].modifiers[modifierName];

                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                for (const stat of state.stats.concat(["hp"])) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                }
                modifiedStat.value = modifierName;

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (
                        !isNaN(
                            state.effects[effectName].modifiers[
                                modifiedStat.value
                            ]
                        )
                    ) {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] += modifiedValue.valueAsNumber;
                    } else {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] = modifiedValue.valueAsNumber;
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (
                        !isNaN(
                            state.effects[effectName].modifiers[
                                previousStatName
                            ]
                        )
                    ) {
                        state.effects[effectName].modifiers[previousStatName] -=
                            modifiedValue.valueAsNumber;
                    } else {
                        state.effects[effectName].modifiers[
                            previousStatName
                        ] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.effects[effectName].modifiers[
                            previousStatName
                        ];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = modifierValue.toString();
                let previousValue: number;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (
                        isNaN(
                            state.effects[effectName].modifiers[
                                modifiedStat.value
                            ]
                        )
                    ) {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] = modifiedValue.valueAsNumber;
                    } else {
                        state.effects[effectName].modifiers[
                            modifiedStat.value
                        ] += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
                deleteModifier.onclick = () => {
                    state.effects[effectName].modifiers[modifiedStat.value] -=
                        modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            }
            effectSheet.appendChild(modifiersElement);

            newEffect.appendChild(effectSheet);

            for (const element of Array.from(
                document.getElementsByClassName("effect-select")
            )) {
                const select = element as HTMLSelectElement;

                const option = document.createElement("option");
                option.text = option.value = effectName;
                select.appendChild(option);
            }

            const deleteEffect = document.createElement("button");
            deleteEffect.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;
            deleteEffect.onclick = () => {
                delete state.effects[effectName];

                for (const element of Array.from(
                    document.getElementsByClassName("effect-select")
                )) {
                    const select = element as HTMLSelectElement;

                    for (const option of Array.from(select.options)) {
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
        }
    }
};

const main = () => {
    const error_place = document.getElementById(
        "errors"
    ) as HTMLParagraphElement;

    const state_text = document.getElementById(
        "state_text"
    ) as HTMLTextAreaElement;
    if (!state_text)
        error_place.innerHTML = "State text could not be retrieved.";
    state_text.onkeydown = (key: KeyboardEvent): any => {
        if (key.code === "Enter" && key.ctrlKey)
            (document.getElementById("serialize") as HTMLButtonElement).click();
    };

    (document.getElementById("new_stat") as HTMLInputElement).onkeydown = (
        event
    ) => {
        if (event.key === "Enter")
            (document.getElementById("add_stat") as HTMLButtonElement).click();
    };

    (document.getElementById("add_stat") as HTMLButtonElement).onclick = () => {
        const statsDiv = document.getElementById("stats") as HTMLDivElement;
        const newStat = (
            document.getElementById("new_stat") as HTMLInputElement
        ).value.trim();
        (document.getElementById("new_stat") as HTMLInputElement).value = "";

        state.stats.push(newStat);

        const newDiv = document.createElement("div");
        newDiv.className = "single_value";

        const inputElement = document.createElement("input");
        inputElement.value = newStat;
        inputElement.onchange = () => {
            state.stats[state.stats.indexOf(newStat)] = inputElement.value;
        };
        newDiv.appendChild(inputElement);

        for (const element of Array.from(
            document.getElementsByClassName("stat-select")
        )) {
            const select = element as HTMLSelectElement;

            const option = document.createElement("option");
            option.text = option.value = newStat;
            select.appendChild(option);
        }

        const deleteStat = document.createElement("button");
        deleteStat.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>`;
        deleteStat.onclick = () => {
            for (const element of Array.from(
                document.getElementsByClassName("stat-select")
            )) {
                const select = element as HTMLSelectElement;

                for (const option of Array.from(select.options)) {
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

    (document.getElementById("new_slot") as HTMLInputElement).onkeydown = (
        event
    ) => {
        if (event.key === "Enter")
            (document.getElementById("add_slot") as HTMLButtonElement).click();
    };

    (document.getElementById("add_slot") as HTMLButtonElement).onclick = () => {
        const slotsDiv = document.getElementById("slots") as HTMLDivElement;
        const newSlot = (
            document.getElementById("new_slot") as HTMLInputElement
        ).value.trim();
        (document.getElementById("new_slot") as HTMLInputElement).value = "";

        slots.push(newSlot);

        const newDiv = document.createElement("div");
        newDiv.className = "single_value";

        const inputElement = document.createElement("input");
        inputElement.value = newSlot;

        let previousValue = inputElement.value;
        inputElement.onchange = () => {
            slots[slots.indexOf(previousValue)] = inputElement.value;

            for (const element of Array.from(
                document.getElementsByClassName("slot-select")
            )) {
                const selectElement = element as HTMLSelectElement;
                for (const option of Array.from(selectElement.options)) {
                    if (option.value === previousValue) {
                        option.value = inputElement.value;
                        option.text = inputElement.value;
                    }
                }
            }

            for (const element of Array.from(
                document.getElementsByClassName(`slot-name-${previousValue}`)
            )) {
                (element as HTMLParagraphElement).innerText =
                    inputElement.value;
                element.className = `slot-name-${inputElement.value}`;
            }

            previousValue = inputElement.value;
        };

        newDiv.appendChild(inputElement);

        for (const element of Array.from(
            document.getElementsByClassName("slot-select")
        )) {
            const select = element as HTMLSelectElement;

            const option = document.createElement("option");
            option.value = option.text = newSlot;
            select.appendChild(option);
        }

        for (const element of Array.from(
            document.getElementsByClassName("equipment-list")
        )) {
            const equipment = element as HTMLUListElement;
            const slotElement = document.createElement("li");

            const slotName = document.createElement("p");
            slotName.innerText = newSlot;
            slotElement.appendChild(slotName);

            const equippedItem = document.createElement("select");
            equippedItem.className = `item-${newSlot}-select item-slot-select`;
            itemsBySlot[newSlot] ??= [];
            for (const itemName of itemsBySlot[newSlot]) {
                const option = document.createElement("option");
                option.text = option.value = itemName;
                equippedItem.appendChild(option);
            }
            const option = document.createElement("option");
            option.text = option.value = "None";
            equippedItem.appendChild(option);
            const characterName: string | null | undefined = element.id.match(
                /([\w\s ']+)-equipment/
            )?.[1];
            if (!characterName) {
                console.error("add slot: character's name could not be found");

                continue;
            }
            equippedItem.onchange = () => {
                if (equippedItem.value === "None")
                    delete state.characters[characterName].items[newSlot];
                else
                    state.characters[characterName].items[newSlot] =
                        state.items[equippedItem.value];
            };

            slotElement.appendChild(equippedItem);

            equipment.appendChild(slotElement);
        }

        const deleteSlot = document.createElement("button");
        deleteSlot.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>`;
        deleteSlot.onclick = () => {
            for (const element of Array.from(
                document.getElementsByClassName("slot-select")
            )) {
                const select = element as HTMLSelectElement;

                for (const option of Array.from(select.options)) {
                    if (option.value === newSlot) {
                        select.removeChild(option);
                        break;
                    }
                }
            }

            for (const element of Array.from(
                document.getElementsByClassName(`item-${newSlot}-select`)
            )) {
                element.parentElement?.remove();
            }

            newDiv.remove();
            slots.splice(slots.indexOf(inputElement.value), 1);
        };
        newDiv.appendChild(deleteSlot);

        slotsDiv.appendChild(newDiv);
    };

    (
        document.getElementById("add_item_inventory") as HTMLButtonElement
    ).onclick = () => {
        if (Object.keys(state.items).length === 0) {
            alert("Error: There are no items");
            return;
        }

        const inventoryDiv = document.getElementById(
            "inventory"
        ) as HTMLDivElement;

        const newDiv = document.createElement("div");
        newDiv.className = "single_value";

        const newSelect = document.createElement("select");
        newSelect.className = "item-select";

        for (const itemName in state.items) {
            const option = document.createElement("option");
            option.value = option.innerText = itemName;
            newSelect.appendChild(option);
        }

        state.inventory.push((newSelect.firstChild as HTMLOptionElement).value);

        newDiv.appendChild(newSelect);

        const deleteItem = document.createElement("button");
        deleteItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>`;
        deleteItem.onclick = () => {
            newDiv.remove();
            state.inventory.splice(state.inventory.indexOf(newSelect.value), 1);
        };
        newDiv.appendChild(deleteItem);

        inventoryDiv.appendChild(newDiv);

        let previousValue = newSelect.value;
        newSelect.onchange = () => {
            state.inventory[state.inventory.indexOf(previousValue)] =
                newSelect.value;
            previousValue = newSelect.value;
        };
    };

    (
        document.getElementById("add_character_side1") as HTMLButtonElement
    ).onclick = () => {
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }

        state.side1 ??= [];
        const side1Div = document.getElementById("side1") as HTMLDivElement;
        const index = side1Div.childElementCount;

        const newDiv = document.createElement("div");
        newDiv.className = "single_value";

        const characterSelect = document.getElementById(
            "new_character_side1"
        ) as HTMLSelectElement;

        const characterName = characterSelect.value;

        const selectedOption = characterSelect.selectedOptions[0];
        characterSelect.removeChild(selectedOption);

        state.side1[index] = characterName;

        const characterParagraph = document.createElement("p");
        characterParagraph.innerText = characterName;

        newDiv.appendChild(characterParagraph);

        const deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>`;
        deleteCharacter.onclick = () => {
            newDiv.remove();
            state.side1?.splice(state.side1?.indexOf(characterName), 1);
            if (Object.keys(state.characters).includes(selectedOption.value))
                characterSelect.appendChild(selectedOption);
        };
        newDiv.appendChild(deleteCharacter);

        side1Div.appendChild(newDiv);
    };

    (
        document.getElementById("add_character_side2") as HTMLButtonElement
    ).onclick = () => {
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }

        state.side2 ??= [];
        const side2Div = document.getElementById("side2") as HTMLDivElement;
        const index = side2Div.childElementCount;

        const newDiv = document.createElement("div");
        newDiv.className = "single_value";

        const characterSelect = document.getElementById(
            "new_character_side2"
        ) as HTMLSelectElement;

        const characterName = characterSelect.value;

        const selectedOption = characterSelect.selectedOptions[0];
        characterSelect.removeChild(selectedOption);

        state.side2[index] = characterName;

        const characterParagraph = document.createElement("p");
        characterParagraph.innerText = characterName;

        newDiv.appendChild(characterParagraph);

        const deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>`;
        deleteCharacter.onclick = () => {
            newDiv.remove();
            state.side2?.splice(state.side2?.indexOf(characterName), 1);
            if (Object.keys(state.characters).includes(selectedOption.value))
                characterSelect.appendChild(selectedOption);
        };
        newDiv.appendChild(deleteCharacter);

        side2Div.appendChild(newDiv);
    };

    (
        document.getElementById("add_character_active") as HTMLButtonElement
    ).onclick = () => {
        if (Object.keys(state.characters).length === 0) {
            alert("Error: There are no characters");
            return;
        }

        state.active ??= [];
        state.inBattle = true;
        const activeDiv = document.getElementById("active") as HTMLDivElement;
        const index = activeDiv.childElementCount;

        const newDiv = document.createElement("div");
        newDiv.className = "single_value";

        const characterSelect = document.getElementById(
            "new_character_active"
        ) as HTMLSelectElement;

        const characterName = characterSelect.value;

        const selectedOption = characterSelect.selectedOptions[0];
        characterSelect.removeChild(selectedOption);

        state.active[index] = characterName;

        const characterParagraph = document.createElement("p");
        characterParagraph.innerText = characterName;

        newDiv.appendChild(characterParagraph);

        const deleteCharacter = document.createElement("button");
        deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>`;
        deleteCharacter.onclick = () => {
            newDiv.remove();
            state.active?.splice(state.active?.indexOf(characterName), 1);
            if (Object.keys(state.characters).includes(selectedOption.value))
                characterSelect.appendChild(selectedOption);
        };
        newDiv.appendChild(deleteCharacter);

        activeDiv.appendChild(newDiv);
    };

    (document.getElementById("new_character") as HTMLInputElement).onkeydown = (
        event
    ) => {
        if (event.key === "Enter")
            (
                document.getElementById("add_character") as HTMLButtonElement
            ).click();
    };

    (document.getElementById("add_character") as HTMLButtonElement).onclick =
        () => {
            const charactersDiv = document.getElementById(
                "characters"
            ) as HTMLDivElement;

            const newCharacterName = (
                document.getElementById("new_character") as HTMLInputElement
            ).value;

            if (Object.keys(state.characters).includes(newCharacterName)) {
                alert("Two characters with the same name cannot coexist");
                return;
            }

            (
                document.getElementById("new_character") as HTMLInputElement
            ).value = "";

            state.characters[newCharacterName] = new Character();
            const newCharacter = document.createElement("div");
            newCharacter.className = "character";

            const characterSheet = document.createElement("ul");
            characterSheet.className = "character-sheet";

            const nameElement = document.createElement("li");
            const nameParagraph = document.createElement("p");
            nameParagraph.innerText = newCharacterName;
            nameElement.appendChild(nameParagraph);
            characterSheet.appendChild(nameElement);

            const levelElement = document.createElement("li");
            const levelParagraph = document.createElement("p");
            levelParagraph.innerText = "Level: ";
            const levelInput = document.createElement("input");
            levelInput.type = "number";
            levelInput.value = String(state.characters[newCharacterName].level);
            levelInput.onchange = () => {
                state.characters[newCharacterName].level =
                    levelInput.valueAsNumber;
            };
            levelElement.appendChild(levelParagraph);
            levelElement.appendChild(levelInput);
            characterSheet.appendChild(levelElement);

            const experienceElement = document.createElement("li");
            const experienceParagraph = document.createElement("p");
            experienceParagraph.innerText = "Experience: ";
            const experienceInput = document.createElement("input");
            experienceInput.type = "number";
            experienceInput.value = String(
                state.characters[newCharacterName].experience
            );
            experienceInput.onchange = () => {
                state.characters[newCharacterName].experience =
                    experienceInput.valueAsNumber;
            };
            experienceElement.appendChild(experienceParagraph);
            experienceElement.appendChild(experienceInput);
            characterSheet.appendChild(experienceElement);

            const expToNextLvlElement = document.createElement("li");
            const expToNextLvlParagraph = document.createElement("p");
            expToNextLvlParagraph.innerText = "Experience to next level: ";
            const expToNextLvlInput = document.createElement("input");
            expToNextLvlInput.type = "number";
            expToNextLvlInput.value = String(
                state.characters[newCharacterName].expToNextLvl
            );
            expToNextLvlInput.onchange = () => {
                state.characters[newCharacterName].expToNextLvl =
                    expToNextLvlInput.valueAsNumber;
            };
            expToNextLvlElement.appendChild(expToNextLvlParagraph);
            expToNextLvlElement.appendChild(expToNextLvlInput);
            characterSheet.appendChild(expToNextLvlElement);

            const skillpointsElement = document.createElement("li");
            const skillpointsParagraph = document.createElement("p");
            skillpointsParagraph.innerText = "Skillpoints:";
            const skillpointsInput = document.createElement("input");
            skillpointsInput.type = "number";
            skillpointsInput.value = String(
                state.characters[newCharacterName].skillpoints
            );
            skillpointsInput.onchange = () => {
                state.characters[newCharacterName].skillpoints =
                    skillpointsInput.valueAsNumber;
            };
            skillpointsElement.appendChild(skillpointsParagraph);
            skillpointsElement.appendChild(skillpointsInput);
            characterSheet.appendChild(skillpointsElement);

            const modifiersParagraph = document.createElement("p");
            modifiersParagraph.innerText = "Stats:";
            characterSheet.appendChild(modifiersParagraph);

            const modifierRefCount: { [key: string]: number } = {};
            const modifiersElement = document.createElement("ul");
            modifiersElement.style.listStyleType = "none";
            const modifierAddElement = document.createElement("li");
            const modifierAdd = document.createElement("button");
            modifierAdd.innerText = "Add stat";
            modifierAdd.onclick = () => {
                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                let selected = false;
                let i = 0;
                for (const stat of state.stats) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (
                        !Object.keys(
                            state.characters[newCharacterName].stats
                        ).includes(stat) &&
                        !selected
                    ) {
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
                    alert(
                        "All of the created stats have been used for this character, create a new stat or modify already existing modifier"
                    );
                    modifiedStat.remove();
                    newModifier.remove();
                    return;
                }

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (
                        state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ]
                    ) {
                        state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ].level += modifiedValue.valueAsNumber;
                    } else {
                        state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ] = new Stat(
                            modifiedStat.value,
                            modifiedValue.valueAsNumber
                        );
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (
                        state.characters[newCharacterName].stats[
                            previousStatName
                        ]
                    ) {
                        state.characters[newCharacterName].stats[
                            previousStatName
                        ].level -= modifiedValue.valueAsNumber;
                    } else {
                        state.characters[newCharacterName].stats[
                            previousStatName
                        ] = new Stat(previousStatName, 0);
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.characters[newCharacterName].stats[
                            previousStatName
                        ];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                let previousValue: number = modifiedValue.valueAsNumber;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (
                        !state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ]
                    ) {
                        state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ] = new Stat(
                            modifiedStat.value,
                            modifiedValue.valueAsNumber
                        );
                    } else {
                        state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ].level += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
                deleteModifier.onclick = () => {
                    state.characters[newCharacterName].stats[
                        modifiedStat.value
                    ].level -= modifiedValue.valueAsNumber;
                    if (
                        state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ].level == 0
                    )
                        delete state.characters[newCharacterName].stats[
                            modifiedStat.value
                        ];
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            characterSheet.appendChild(modifiersElement);

            const equipmentElement = document.createElement("li");
            const equipmentParagraph = document.createElement("p");
            equipmentParagraph.innerText = "Equipment:";
            equipmentElement.appendChild(equipmentParagraph);

            const equipment = document.createElement("ul");
            equipment.className = "equipment-list";
            equipment.id = `${newCharacterName.replace(" ", "-")}-equipment`;
            for (const slot of slots) {
                const slotElement = document.createElement("li");

                const slotName = document.createElement("p");
                slotName.innerText = slot;
                slotName.className = `slot-name-${slot}`;
                slotElement.appendChild(slotName);

                const equippedItem = document.createElement("select");
                equippedItem.className = `item-${slot}-select item-slot-select`;
                itemsBySlot[slot] ??= [];
                for (const itemName of itemsBySlot[slot]) {
                    const option = document.createElement("option");
                    option.text = option.value = itemName;
                    equippedItem.appendChild(option);
                }

                const option = document.createElement("option");
                option.text = option.value = "None";
                equippedItem.appendChild(option);

                equippedItem.value = "None";

                equippedItem.onchange = () => {
                    if (equippedItem.value === "None")
                        delete state.characters[newCharacterName].items[slot];
                    else
                        state.characters[newCharacterName].items[slot] =
                            state.items[equippedItem.value];
                };

                slotElement.appendChild(equippedItem);

                equipment.appendChild(slotElement);
            }
            equipmentElement.appendChild(equipment);
            characterSheet.appendChild(equipmentElement);

            const effectsElement = document.createElement("li");
            const effectsParagraph = document.createElement("p");
            effectsParagraph.innerText = "Effects:";
            effectsElement.appendChild(effectsParagraph);
            const effects = document.createElement("div");
            effects.className = "list";
            effectsElement.appendChild(effects);

            const effectAddInput = document.createElement("select");
            effectAddInput.className = "effect-select";
            for (const effectName in state.effects) {
                const option = document.createElement("option");
                option.value = option.innerText = effectName;
                effectAddInput.appendChild(option);
            }

            const effectAddButton = document.createElement("button");
            effectAddButton.innerText = "+";

            effectAddButton.onclick = () => {
                if (!state.characters[newCharacterName].activeEffects) {
                    state.characters[newCharacterName].activeEffects = [];
                }
                const selectedOption = effectAddInput.selectedOptions[0];
                state.characters[newCharacterName].activeEffects?.push(
                    state.effects[selectedOption.value]
                );

                const newElement = document.createElement("div");

                const newEffect = document.createElement("p");
                newEffect.innerText = selectedOption.value;
                newElement.appendChild(newEffect);

                state.characters[newCharacterName].activeEffects?.push(
                    state.effects[effectAddInput.value]
                );

                const deleteElement = document.createElement("button");
                deleteElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;

                deleteElement.onclick = () => {
                    if (!state.characters[newCharacterName].activeEffects) {
                        console.error("Effects disappeared?!");

                        return;
                    }
                    state.characters[newCharacterName].activeEffects ??= [];
                    state.characters[newCharacterName].activeEffects?.splice(
                        state.characters[
                            newCharacterName
                        ].activeEffects?.indexOf(
                            state.effects[selectedOption.value]
                        ) ?? 0,
                        1
                    );
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

            for (const element of Array.from(
                document.getElementsByClassName("character-select")
            )) {
                const select = element as HTMLSelectElement;

                const option = document.createElement("option");
                option.text = option.value = newCharacterName;
                select.appendChild(option);
            }

            const deleteCharacter = document.createElement("button");
            deleteCharacter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
            deleteCharacter.onclick = () => {
                for (const element of Array.from(
                    document.getElementsByClassName("character-select")
                )) {
                    const select = element as HTMLSelectElement;

                    for (const option of Array.from(select.options)) {
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

    (document.getElementById("new_item") as HTMLInputElement).onkeydown = (
        event
    ) => {
        if (event.key === "Enter")
            (document.getElementById("add_item") as HTMLButtonElement).click();
    };

    (document.getElementById("add_item") as HTMLInputElement).onclick = () => {
        if (slots.length === 0) {
            (
                document.getElementById("errors") as HTMLParagraphElement
            ).innerText = "Create a slot for the items.";
            return;
        }

        const itemsDiv = document.getElementById("items") as HTMLDivElement;
        const newItemName = (
            document.getElementById("new_item") as HTMLInputElement
        ).value;
        if (Object.keys(state.items).includes(newItemName)) {
            alert("Two items with the same name cannot coexist");
            return;
        }

        (document.getElementById("new_item") as HTMLInputElement).value = "";

        state.items[newItemName] = new Item(newItemName, []);

        const newItem = document.createElement("div");
        newItem.className = "item";

        const itemSheet = document.createElement("ul");
        itemSheet.className = "item-sheet";

        const nameElement = document.createElement("li");
        const nameParagraph = document.createElement("p");
        nameParagraph.innerText = newItemName;
        nameElement.appendChild(nameParagraph);
        itemSheet.appendChild(nameElement);

        const slotElement = document.createElement("li");
        const slotSelect = document.createElement("select");
        slotSelect.className = "slot-select";
        for (const slot of slots) {
            const option = document.createElement("option");
            option.text = option.value = slot;
            slotSelect.appendChild(option);
        }
        slotSelect.value = slots[0];

        if (!itemsBySlot[slotSelect.value]) {
            itemsBySlot[slotSelect.value] = [newItemName];
        } else {
            itemsBySlot[slotSelect.value].push(newItemName);
        }

        for (const element of Array.from(
            document.getElementsByClassName(`item-${slotSelect.value}-select`)
        )) {
            const select = element as HTMLSelectElement;

            const option = document.createElement("option");
            option.text = option.value = newItemName;
            select.appendChild(option);
        }

        let previousValue = slotSelect.value;
        slotSelect.onchange = () => {
            state.items[newItemName].slot = slotSelect.value;

            if (!itemsBySlot[slotSelect.value]) {
                itemsBySlot[slotSelect.value] = [newItemName];
            } else {
                itemsBySlot[slotSelect.value].push(newItemName);
            }

            for (const element of Array.from(
                document.getElementsByClassName(
                    `item-${slotSelect.value}-select`
                )
            )) {
                const select = element as HTMLSelectElement;

                const option = document.createElement("option");
                option.text = option.value = newItemName;
                select.appendChild(option);
            }

            itemsBySlot[previousValue].splice(
                itemsBySlot[previousValue].indexOf(newItemName),
                1
            );

            for (const element of Array.from(
                document.getElementsByClassName(`item-${previousValue}-select`)
            )) {
                const select = element as HTMLSelectElement;

                for (const option of Array.from(select.options)) {
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

        const effectsElement = document.createElement("li");
        const effects = document.createElement("div");
        effects.className = "list";
        effectsElement.appendChild(effects);

        const effectAddInput = document.createElement("select");
        effectAddInput.className = "effect-select";
        for (const effectName in state.effects) {
            const option = document.createElement("option");
            option.value = option.innerText = effectName;
            effectAddInput.appendChild(option);
        }

        const effectAddButton = document.createElement("button");
        effectAddButton.innerText = "+";

        effectAddButton.onclick = () => {
            const selectedOption = effectAddInput.selectedOptions[0];
            state.items[newItemName].effects.push(selectedOption.value);

            const newElement = document.createElement("div");

            const newEffect = document.createElement("p");
            newEffect.innerText = selectedOption.value;
            newElement.appendChild(newEffect);

            const deleteElement = document.createElement("button");
            deleteElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>`;

            deleteElement.onclick = () => {
                state.items[newItemName].effects.splice(
                    state.items[newItemName].effects.indexOf(
                        selectedOption.value
                    ),
                    1
                );
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

        const modifiersParagraph = document.createElement("p");
        modifiersParagraph.innerText = "Modifiers:";
        itemSheet.appendChild(modifiersParagraph);

        const modifierRefCount: { [key: string]: number } = {};
        const modifiersElement = document.createElement("ul");
        modifiersElement.style.listStyleType = "none";
        const modifierAddElement = document.createElement("li");
        const modifierAdd = document.createElement("button");
        modifierAdd.innerText = "Add modifier";
        modifierAdd.onclick = () => {
            const newModifier = document.createElement("li");
            newModifier.className = "single_value";
            const modifiedStat = document.createElement("select");
            modifiedStat.className = "stat-select";
            let selected = false;
            let i = 0;
            for (const stat of state.stats) {
                const statOption = document.createElement("option");
                statOption.innerText = statOption.value = stat;
                modifiedStat.appendChild(statOption);
                if (
                    !Object.keys(state.items[newItemName].modifiers).includes(
                        stat
                    ) &&
                    !selected
                ) {
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
                alert(
                    "All of the created stats have been used for this item, create a new stat or modify already existing modifier"
                );
                modifiedStat.remove();
                newModifier.remove();
                return;
            }

            let previousStatName: string;

            modifiedStat.onfocus = () => {
                previousStatName = modifiedStat.value;
            };

            modifiedStat.onchange = () => {
                if (
                    !isNaN(
                        state.items[newItemName].modifiers[modifiedStat.value]
                    )
                ) {
                    state.items[newItemName].modifiers[modifiedStat.value] +=
                        modifiedValue.valueAsNumber;
                } else {
                    state.items[newItemName].modifiers[modifiedStat.value] =
                        modifiedValue.valueAsNumber;
                }

                modifierRefCount[modifiedStat.value] = isNaN(
                    modifierRefCount[modifiedStat.value]
                )
                    ? 1
                    : modifierRefCount[modifiedStat.value] + 1;

                if (
                    !isNaN(state.items[newItemName].modifiers[previousStatName])
                ) {
                    state.items[newItemName].modifiers[previousStatName] -=
                        modifiedValue.valueAsNumber;
                } else {
                    state.items[newItemName].modifiers[previousStatName] = 0;
                }
                --modifierRefCount[previousStatName];
                if (
                    modifierRefCount[previousStatName] === 0 ||
                    isNaN(modifierRefCount[previousStatName])
                ) {
                    delete state.items[newItemName].modifiers[previousStatName];
                }
                previousStatName = modifiedStat.value;
            };

            newModifier.appendChild(modifiedStat);
            const modifiedValue = document.createElement("input");
            modifiedValue.type = "number";
            modifiedValue.value = "0";
            let previousValue: number;
            modifiedValue.onfocus = () => {
                previousValue = modifiedValue.valueAsNumber;
            };
            modifiedValue.onchange = () => {
                if (isNaN(modifiedValue.valueAsNumber)) return;

                if (
                    isNaN(
                        state.items[newItemName].modifiers[modifiedStat.value]
                    )
                ) {
                    state.items[newItemName].modifiers[modifiedStat.value] =
                        modifiedValue.valueAsNumber;
                } else {
                    state.items[newItemName].modifiers[modifiedStat.value] +=
                        modifiedValue.valueAsNumber - previousValue;
                }
                previousValue = modifiedValue.valueAsNumber;
            };
            newModifier.appendChild(modifiedValue);

            const deleteModifier = document.createElement("button");
            deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
            deleteModifier.onclick = () => {
                state.items[newItemName].modifiers[modifiedStat.value] -=
                    modifiedValue.valueAsNumber;
                --modifierRefCount[previousStatName];
                if (
                    modifierRefCount[previousStatName] === 0 ||
                    isNaN(modifierRefCount[previousStatName])
                ) {
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

        for (const element of Array.from(
            document.getElementsByClassName("item-select")
        )) {
            const select = element as HTMLSelectElement;

            const option = document.createElement("option");
            option.text = option.value = newItemName;
            select.appendChild(option);
        }

        const deleteItem = document.createElement("button");
        deleteItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
        deleteItem.onclick = () => {
            for (const element of Array.from(
                document.getElementsByClassName("item-select")
            )) {
                const select = element as HTMLSelectElement;

                for (const option of Array.from(select.options)) {
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

    (document.getElementById("new_effect") as HTMLInputElement).onkeydown = (
        event
    ) => {
        if (event.key === "Enter")
            (
                document.getElementById("add_effect") as HTMLButtonElement
            ).click();
    };

    (document.getElementById("add_effect") as HTMLButtonElement).onclick =
        () => {
            const effectsDiv = document.getElementById(
                "effects"
            ) as HTMLDivElement;

            const newEffectName = (
                document.getElementById("new_effect") as HTMLInputElement
            ).value;
            if (Object.keys(state.effects).includes(newEffectName)) {
                alert("Two effects with the same name cannot coexist");
                return;
            }

            (document.getElementById("new_effect") as HTMLInputElement).value =
                "";

            state.effects[newEffectName] = new Effect(
                newEffectName,
                [],
                5,
                "attack",
                "enemy",
                "on end",
                false
            );

            const newEffect = document.createElement("div");
            const effectSheet = document.createElement("ul");
            effectSheet.className = "effect-sheet";

            const nameElement = document.createElement("li");
            const nameParagraph = document.createElement("p");
            nameParagraph.innerText = newEffectName;
            nameElement.appendChild(nameParagraph);
            effectSheet.appendChild(nameElement);

            const baseDurationElement = document.createElement("li");
            const baseDurationParagraph = document.createElement("p");
            baseDurationParagraph.innerText = "Base duration: ";
            baseDurationElement.appendChild(baseDurationParagraph);
            const baseDurationInput = document.createElement("input");
            baseDurationInput.type = "number";
            baseDurationInput.value = "5";
            baseDurationInput.onchange = () => {
                state.effects[newEffectName].baseDuration = state.effects[
                    newEffectName
                ].durationLeft = baseDurationInput.valueAsNumber;
            };
            baseDurationElement.appendChild(baseDurationInput);
            effectSheet.appendChild(baseDurationElement);

            const applyUniqueElement = document.createElement("li");
            const applyUniqueParagraph = document.createElement("p");
            applyUniqueParagraph.innerText = "Apply unique: ";
            applyUniqueElement.appendChild(applyUniqueParagraph);
            const applyUniqueInput = document.createElement("input");
            applyUniqueInput.type = "checkbox";
            applyUniqueInput.checked = false;
            applyUniqueInput.onchange = () => {
                state.effects[newEffectName].applyUnique =
                    applyUniqueInput.checked;
            };
            applyUniqueElement.appendChild(applyUniqueInput);
            effectSheet.appendChild(applyUniqueElement);

            const appliedOnElement = document.createElement("li");
            const appliedOnParagraph = document.createElement("p");
            appliedOnParagraph.innerText = "Applied on: ";
            appliedOnElement.appendChild(appliedOnParagraph);
            const appliedOnInput = document.createElement("select");
            for (const option of [
                "attack",
                "defense",
                "battle start",
                "not applied",
            ]) {
                const appliedOnOption = document.createElement("option");
                appliedOnOption.innerText = appliedOnOption.value = option;
                appliedOnInput.appendChild(appliedOnOption);
            }
            appliedOnInput.selectedIndex = 0;
            appliedOnInput.onchange = () => {
                switch (appliedOnInput.value) {
                    case "attack":
                    case "defense":
                    case "battle start":
                    case "not applied":
                        state.effects[newEffectName].appliedOn =
                            appliedOnInput.value;
                        break;
                    default:
                        (
                            document.getElementById(
                                "errors"
                            ) as HTMLParagraphElement
                        ).innerHTML = "appliedOn invalid";
                }
            };
            appliedOnElement.appendChild(appliedOnInput);
            effectSheet.appendChild(appliedOnElement);

            const appliedToElement = document.createElement("li");
            const appliedToParagraph = document.createElement("p");
            appliedToParagraph.innerText = "Applied to: ";
            appliedToElement.appendChild(appliedToParagraph);
            const appliedToInput = document.createElement("select");
            for (const option of ["enemy", "self"]) {
                const appliedToOption = document.createElement("option");
                appliedToOption.innerText = appliedToOption.value = option;
                appliedToInput.appendChild(appliedToOption);
            }
            appliedToInput.selectedIndex = 0;
            appliedToInput.onchange = () => {
                switch (appliedToInput.value) {
                    case "self":
                    case "enemy":
                        state.effects[newEffectName].appliedTo =
                            appliedToInput.value;
                        break;
                    default:
                        (
                            document.getElementById(
                                "errors"
                            ) as HTMLParagraphElement
                        ).innerHTML = "appliedTo invalid";
                }
            };
            appliedToElement.appendChild(appliedToInput);
            effectSheet.appendChild(appliedToElement);

            const impactElement = document.createElement("li");
            const impactParagraph = document.createElement("p");
            impactParagraph.innerText = "Impact: ";
            impactElement.appendChild(impactParagraph);
            const impactInput = document.createElement("select");
            for (const option of ["on end", "continuous", "every turn"]) {
                const impactOption = document.createElement("option");
                impactOption.innerText = impactOption.value = option;
                impactInput.appendChild(impactOption);
            }
            impactInput.selectedIndex = 0;
            impactInput.onchange = () => {
                switch (impactInput.value) {
                    case "on end":
                    case "continuous":
                    case "every turn":
                        state.effects[newEffectName].impact = impactInput.value;
                        break;
                    default:
                        (
                            document.getElementById(
                                "errors"
                            ) as HTMLParagraphElement
                        ).innerHTML = "impact invalid";
                }
            };
            impactElement.appendChild(impactInput);
            effectSheet.appendChild(impactElement);

            const modifiersParagraph = document.createElement("p");
            modifiersParagraph.innerText = "Modifiers:";
            effectSheet.appendChild(modifiersParagraph);

            const modifierRefCount: { [key: string]: number } = {};
            const modifiersElement = document.createElement("ul");
            modifiersElement.style.listStyleType = "none";
            const modifierAddElement = document.createElement("li");
            const modifierAdd = document.createElement("button");
            modifierAdd.innerText = "Add modifier";
            modifierAdd.onclick = () => {
                const newModifier = document.createElement("li");
                newModifier.className = "single_value";
                const modifiedStat = document.createElement("select");
                modifiedStat.className = "stat-select";
                let selected = false;
                let i = 0;
                for (const stat of state.stats.concat(["hp"])) {
                    const statOption = document.createElement("option");
                    statOption.innerText = statOption.value = stat;
                    modifiedStat.appendChild(statOption);
                    if (
                        !Object.keys(
                            state.effects[newEffectName].modifiers
                        ).includes(stat) &&
                        !selected
                    ) {
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
                    alert(
                        "All of the created stats have been used for this effect, create a new stat or modify already existing modifier"
                    );
                    modifiedStat.remove();
                    newModifier.remove();
                    return;
                }

                let previousStatName: string;

                modifiedStat.onfocus = () => {
                    previousStatName = modifiedStat.value;
                };

                modifiedStat.onchange = () => {
                    if (
                        !isNaN(
                            state.effects[newEffectName].modifiers[
                                modifiedStat.value
                            ]
                        )
                    ) {
                        state.effects[newEffectName].modifiers[
                            modifiedStat.value
                        ] += modifiedValue.valueAsNumber;
                    } else {
                        state.effects[newEffectName].modifiers[
                            modifiedStat.value
                        ] = modifiedValue.valueAsNumber;
                    }

                    modifierRefCount[modifiedStat.value] = isNaN(
                        modifierRefCount[modifiedStat.value]
                    )
                        ? 1
                        : modifierRefCount[modifiedStat.value] + 1;

                    if (
                        !isNaN(
                            state.effects[newEffectName].modifiers[
                                previousStatName
                            ]
                        )
                    ) {
                        state.effects[newEffectName].modifiers[
                            previousStatName
                        ] -= modifiedValue.valueAsNumber;
                    } else {
                        state.effects[newEffectName].modifiers[
                            previousStatName
                        ] = 0;
                    }
                    --modifierRefCount[previousStatName];
                    if (
                        modifierRefCount[previousStatName] === 0 ||
                        isNaN(modifierRefCount[previousStatName])
                    ) {
                        delete state.effects[newEffectName].modifiers[
                            previousStatName
                        ];
                    }
                    previousStatName = modifiedStat.value;
                };

                newModifier.appendChild(modifiedStat);
                const modifiedValue = document.createElement("input");
                modifiedValue.type = "number";
                modifiedValue.value = "0";
                let previousValue: number;
                modifiedValue.onfocus = () => {
                    previousValue = modifiedValue.valueAsNumber;
                };
                modifiedValue.onchange = () => {
                    if (isNaN(modifiedValue.valueAsNumber)) return;

                    if (
                        isNaN(
                            state.effects[newEffectName].modifiers[
                                modifiedStat.value
                            ]
                        )
                    ) {
                        state.effects[newEffectName].modifiers[
                            modifiedStat.value
                        ] = modifiedValue.valueAsNumber;
                    } else {
                        state.effects[newEffectName].modifiers[
                            modifiedStat.value
                        ] += modifiedValue.valueAsNumber - previousValue;
                    }
                    previousValue = modifiedValue.valueAsNumber;
                };
                newModifier.appendChild(modifiedValue);

                const deleteModifier = document.createElement("button");
                deleteModifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
                deleteModifier.onclick = () => {
                    state.effects[newEffectName].modifiers[
                        modifiedStat.value
                    ] -= modifiedValue.valueAsNumber;
                    newModifier.remove();
                };
                newModifier.appendChild(deleteModifier);
                modifiersElement.appendChild(newModifier);
            };
            modifierAddElement.appendChild(modifierAdd);
            modifiersElement.appendChild(modifierAddElement);
            effectSheet.appendChild(modifiersElement);

            newEffect.appendChild(effectSheet);

            for (const element of Array.from(
                document.getElementsByClassName("effect-select")
            )) {
                const select = element as HTMLSelectElement;

                const option = document.createElement("option");
                option.text = option.value = newEffectName;
                select.appendChild(option);
            }

            const deleteEffect = document.createElement("button");
            deleteEffect.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>`;
            deleteEffect.onclick = () => {
                delete state.effects[newEffectName];

                for (const element of Array.from(
                    document.getElementsByClassName("effect-select")
                )) {
                    const select = element as HTMLSelectElement;

                    for (const option of Array.from(select.options)) {
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

    (document.getElementById("state_default") as HTMLButtonElement).onclick =
        () => {
            state = copy(defaultState);
            state_text.value = JSON.stringify(state);
            UpdateFields();
        };

    (document.getElementById("serialize") as HTMLButtonElement).onclick = () =>
        (state_text.value = JSON.stringify(state));
    (document.getElementById("deserialize") as HTMLButtonElement).onclick =
        () => ParseState(state_text.value);
    UpdateFields();
};

try {
    main();
} catch (error) {
    let message =
        error instanceof Error ? error.message : JSON.stringify(error);
    (document.getElementById("errors") as HTMLParagraphElement).innerHTML =
        message;
    console.error(error);
}

window.addEventListener("beforeunload", function (event) {
    event.preventDefault();
    event.returnValue = "";
});

let levellingToOblivion = confirm(
    "Are you levelling to oblivion?\n(No by default; if in doubt, check Input Modifier on your scenario.)"
);
