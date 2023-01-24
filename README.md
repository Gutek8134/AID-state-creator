## Description
Manager for state used in [AID-dice-rolling](https://github.com/Gutek8134/AID-dice-rolling).<br>
Doesn't work on Windows 7 or older.

# Values

## Dice
Specifies a dice to be rolled when skillchecking.

## Punishment
When your character's hp is 0 or lower, a punishment is applied on skillchecks (unless you turn it off in the code).<br>
This specifies the value.

## Starting HP
Default hp characters are created with.

## Starting Level
When creating a character with `!addcharacter`, they receive all previously created stats at this level if the value is not given.

## Skillpoints on level up
When not leveling to oblivion, specifies how much skillpoints should be awarded on leveling up.

# Special stats
Every character has their special stats that cannot be overriden, but can be changed.<br>
They are:

## hp
Current hp of the character.

## isNpc

Says whether this character is an NPC. [Here](https://github.com/Gutek8134/AID-dice-rolling#addnpc) are the differences.

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

# Editing state

The buttons Options and Characters let you switch to the corresponding view.<br>
Every value and stat parameter needs to be a whole number.<br>
Character and stat creating buttons are under the corresponding lists.<br>

# Usage

1. Download state manager.exe or the whole package on your machine.
2. (optional) Copy your state from `!getstate` to state.txt, deleting showcase data.
3. Run state manager.exe
4. Answer to the question. If you are not sure, check levellingToOblivion value in the Input Modifier.
5. (optional) If you've done step 2, click on the IMPORT STATE button.
6. Edit your state.
7. When you are done, click on GENERATE STATE button.<br>
Close every character window you've opened, as this saves the data.
8. Copy the content of the text box beneath it and use `!setstate(copied info)` in your adventure.<br>
If you've done everything right, you'll get output "State was set correctly. State created with AID state manager.".
