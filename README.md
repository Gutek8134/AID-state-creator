## Description

Manager for state used in [AID-dice-rolling](https://github.com/Gutek8134/AID-dice-rolling).<br>
Should work on the following:

-   Chrome 66 or newer
-   Edge 79 or newer
-   Firefox 61 or newer
-   Safari 12 or newer
-   Opera 50 or newer
    but I've only tested it with Firefox. Create an issue if something seems wrong on your browser.

WARNING: Current version isn't compatible with AID dice rolling items update.

# Values

## Dice added to skill checks

Specifies a dice to be rolled when skillchecking and attacking.

## Starting Level

When creating a character with `!addcharacter`, they receive all previously created stats at this level if the value is not given.

## Starting HP

Default hp characters are created with.

## Skillpoints on level up

When not leveling to oblivion, specifies how much skillpoints should be awarded on leveling up.

## Punishment for being "dead"

When your character's hp is 0 or lower, a punishment is applied on skillchecks (unless you turn it off in the code).<br>
This specifies the exact value.

## In battle

Is there a battle currently going on?<br>
If the answer is yes, battle side 1 and 2 need to have at least character.

## Run effects when not in battle

Effect have timers that determine whether they should be applied, decreased every action.

It'll be easier to explain on an example. You have a poisoned character that loses HP every round.

If this is set to false, they will stop losing HP once the battle finishes, but they will still be poisoned and the timer will not decrease.

If this is set to true, they will continue to lose their HP, but the timer will also continue to decrease.

## Last input

Your last action's text.

## Last input context override

AI doesn't see as much as you do while generating the first output after a command - I'm mostly hiding the numbers, keeping only the descriptions of how severe were the results. If specified, this field provides the exact text that AI will see instead of `Last input`

## Output override

The message that will be displayed as the first output.

## Slots

Equipment slots. You need to have at least one to create items.

## Stats

What kind of stats you can possess. Please don't use any of the special stats.

# Special stats

Every character has their special stats. Change them at your own risk.<br>
They are:

## hp

Current hp of the character.

## isNpc

Says whether this character is an NPC. You can check the differences [here](https://github.com/Gutek8134/AID-dice-rolling#addnpc).

## level

Current level of the character.

## experience

Current experience of the character.<br>
Every skillcheck and attack grants one xp.

## skillpoints

Current free skillpoints of the character.<br>
They can be assigned by `!levelStats` command.

## expToNextLvl

Experience needed to level up.<br>
experience resets after every level up.<br>
Affects only current level. If you need more permanent solution,<br>
edit experienceCalculation function in Shared Library.

## Inventory

The current contents of your party's inventory.

## Battle side 1, 2

While you are in battle, battle side 1 is your party, battle side 2 is your enemies

## Active characters

Characters that have not taken their turn in battle yet.

## Characters

List of all of your characters with editable parameters, equipment, and active effects

## Items

List of all of your items with editable slot, applicable effects, and bonuses to your stats (called modifiers, because they can be negative)

## Effects

List of all of your effects. Explanation of these parameters can be found [here](https://github.com/Gutek8134/AID-dice-rolling#createeffect).

Naming:

Base duration = duration<br>
Apply unique = unique

# Usage

1. Download `index.html`, `script.js`, `style.css` onto your machine. Keep them in the same folder, but you can move them around.
2. Run `index.html`
3. Answer to the question "Are you levelling to oblivion?". If you are not sure, check levellingToOblivion value in the Input Modifier.
4. (optional) Copy your state from `!getstate` to the bottom most field that says (Paste your state here).
5. (optional) If you've done step 4, click on the Load button below.
6. Edit your state.
7. When you are done, click on Save button.<br>WARNING: The program does **not** save anything onto your machine, only updates the field. If you need a local copy, save it through notepad or other text editor.<br>
8. Copy the content of the bg text box (I recommend clicking on it, then Ctrl-A, Ctrl-C) it and use `!setstate(copied contents)` in your adventure.<br>
   If you've done everything right and left `Output override` empty, you'll get output "State was set correctly. State created with AID state manager." If `Output override` was not empty, you should see its content.
