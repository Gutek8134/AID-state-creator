from collections import defaultdict
from functools import partial
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.messagebox
import json
import sys
import re
from xmlrpc.client import Boolean

# Some static things so the program will know to pass object as string, dictionary, something else or ignore/skip it
objectValues = ("stats", "characters")
ignoredValues = ("ctxt", "out", "message", "memory", "side1", "side2",
                 "active", "inBattle", "attCharInd", "currentSide", "activeCharacterName")
levelValues = ("level", "experience", "skillpoints", "expToNextLvl")

# Makes the characters objects appear in new windows


class CharacterWindow(tk.Toplevel):
    windows: list[str] = []

    def __init__(self, master: tk.Misc | None = ..., *, charName: str = ..., **kwargs) -> None:
        super().__init__(master, **kwargs)
        # Makes sure a window copy doesn't exist
        if charName in CharacterWindow.windows:
            self.destroy()
            return
        # List for making new stats appear when others were deleted
        self.used = []
        self.charName = charName
        # Adds character name to static list
        CharacterWindow.windows.append(charName)
        # Changes the title to be character's name
        self.title(charName)
        # Copies and converts stats from the Main window
        self.stats: defaultdict[str, tk.StringVar | tk.BooleanVar | dict] = defaultdict(
            tk.StringVar, {k: v if isinstance(v, dict) else tk.BooleanVar(value=v) if isinstance(v, bool) else tk.StringVar(value=v) for k, v in Main.state["characters"][charName].items()}.items())

        self.geometry("700x300")

        # Enabling scrolling

        # Makes scroll wheel work
        _on_mousewheel = {"win32": lambda event: self.contentField.yview_scroll(
            int(-1*(event.delta/120)), "units"), "darwin": lambda event: self.contentField.yview_scroll(int(event.delta), "units")}
        self.contentField = tk.Canvas(self)
        if sys.platform != "linux2":
            self.contentField.bind_all(
                "<MouseWheel>", _on_mousewheel[sys.platform])
        else:
            self.contentField.bind_all(
                "<Button-4>", lambda event: self.contentField.yview_scroll(int((event.delta/120)), "units"))
            self.contentField.bind_all(
                "<Button-5>", lambda event: self.contentField.yview_scroll(int(-1*(event.delta/120)), "units"))

        # Creating scrollbars
        contentVSB = ttk.Scrollbar(
            self, orient=tk.VERTICAL, command=self.contentField.yview)
        contentHSB = ttk.Scrollbar(
            self, orient=tk.HORIZONTAL, command=self.contentField.xview)

        # IDK what it does, but StackOverflow says it needs to be done
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Binds scrolling to scrollbars
        self.contentField.configure(
            xscrollcommand=contentHSB.set, yscrollcommand=contentVSB.set)

        # Puts field and scrollbars on the grid
        self.contentField.grid(column=0, row=0, sticky=tk.NSEW)
        contentVSB.grid(column=1, row=0, sticky=tk.NS)
        contentHSB.grid(column=0, row=1, sticky=tk.EW)

        # Again, IDK what it does
        self.contentField.bind("<Configure>", lambda event: self.contentField.configure(
            scrollregion=self.contentField.bbox("all")))

        # End of enabling scrolling

        # Stats are bigger when levelling to oblivion, so they need more place
        mod = 1.5 if Main.LTO else 1

        # Holds values and stats object in a dict for easy access
        self.statsValues: dict[str, Value] = {}

        for stat, val in self.stats.items():
            # When levelling to oblivion, stats, not characters, are not leveling, so character's levels are not expected to show up
            if stat in levelValues and Main.LTO:
                continue

            # Gets position once, or the value would be different for putting on and Stat freeing it
            pos = self.getPosition()

            # Changes stringvars to values and dictionaries to stats
            self.statsValues[stat] = Value(
                self, stat, variable=val, position=pos) if isinstance(val, tk.StringVar) or isinstance(val, tk.BooleanVar)\
                else Stat(self, stat, values=val, position=pos)

            # Puts everything onto the canvas
            self.contentField.create_window(
                0, 45*mod*pos, anchor=tk.NW, window=self.statsValues[stat])

            self.contentField.configure(
                scrollregion=self.contentField.bbox("all"))

        # Objects for creating new stats
        self.statName = ttk.Entry(self, textvariable=tk.StringVar())
        self.statCreateButton = ttk.Button(
            self, command=self.createStat, text="Add stat")
        self.statName.grid(column=0, row=2)
        self.statCreateButton.grid(column=1, row=2)

        # Custom save and close
        self.protocol("WM_DELETE_WINDOW", self.close)

    def createStat(self):
        # Stats are bigger when levelling to oblivion, so they need more place
        mod = 1.5 if Main.LTO else 1

        # Tries character's names against pattern from dice rolling
        pattern = r"^\w[\w ']+$"
        match = re.match(pattern, self.statName.get().strip())

        # If they don't pass the test, user sees an error message
        if match is None:
            tkinter.messagebox.showerror(
                "Error", "Invalid name. Valid names must contain at least one non-whitespace character. Allowed characters are numbers, latin letters and apostrophe.")
            return

        # Shortening the variable name
        stat = match.group().lower()

        # Like error says, you can't override default parameter of a character
        if stat in levelValues:
            tkinter.messagebox.showerror(
                "Error", "You cannot override default parameters of a character. Maybe you're using the wrong mode?")
            return

        # Duplicate stats are also deleted
        if stat in self.statsValues:
            tkinter.messagebox.showerror(
                "Error", "Stat already exists in this character.")
            return

        # Creating stats as in __init__
        pos = self.getPosition()
        self.statsValues[stat] = Stat(
            self, stat, values={"level": 1, "experience": 0, "expToNextLvl": 2}, position=pos)
        self.contentField.create_window(
            0, 45*mod*pos, anchor=tk.NW, window=self.statsValues[stat])

        self.contentField.configure(
            scrollregion=self.contentField.bbox("all"))

        # Clearing the entry
        self.statName.delete(0, "end")

    # Saves and closes the window
    def close(self):
        # Gets values and stats, then sets them to the local variable
        for statVal in self.statsValues:
            if self.statsValues[statVal].val is None:
                return
            self.stats[statVal] = int(self.statsValues[statVal].val.get()) if isinstance(
                self.statsValues[statVal].val, ttk.Entry)else self.statsValues[statVal].val

        for k, v in self.stats.items():
            if isinstance(v, tk.StringVar):
                try:
                    self.stats[k] = int(v.get())
                except ValueError:
                    tkinter.messagebox.showerror(f"{k} must be a number")
                    return

        # If nothing went wrong, lets the window be opened again
        CharacterWindow.windows.remove(self.charName)

        # Saves the changes to Main.state dict
        Main.state["characters"][self.charName] = self.stats

        # And finally closes the window
        self.destroy()

    # Gets the first free number and looks for holes to fill
    def getPosition(self):
        position = 0
        while position < len(self.used):
            if position not in self.used:
                break
            position += 1
        self.used.append(position)
        return position

# Class for things that can't be removed and are just numbers


class Value(ttk.Frame):
    def __init__(self, master=..., text="", key: str = None, variable: tk.StringVar | tk.BooleanVar = ..., position=...) -> None:
        super().__init__(master)

        # This can be either CharacterWindow and Main
        self.master = master

        # Saves the position if it would be needed in future
        self.position = position

        # If textvar wasn't given, gets value from Main.state
        variable = Main.state[key] if variable == ... else variable

        # Makes it look like [Name: ] [Input field]
        self.text = ttk.Label(self, text=text)
        if not isinstance(variable, tk.BooleanVar):
            self.val = ttk.Entry(
                self, textvariable=variable)
            self.text.grid(column=0, row=0)
            self.val.grid(column=1, row=0)
        else:
            self.val = variable.get()
            self.text.grid(column=1, row=0)
            self.checkboxValue: tk.IntVar = tk.IntVar()
            self.checkbox = ttk.Checkbutton(
                self, variable=self.checkboxValue, command=self.changeValue)
            self.checkbox.grid(column=0, row=0)

    def changeValue(self):
        self.val = bool(self.checkboxValue.get())


# Class for creating removable stats


class Stat(ttk.Frame):
    def __init__(self, master: CharacterWindow = ..., stat: str = "", *, values: dict = ..., position=..., **kwargs) -> None:
        # Makes sure every stat is in stats array (requirement for dice rolling)
        if stat not in Main.state["stats"]:
            Main.state["stats"].append(stat)
        # Creates the Frame
        super().__init__(master, **kwargs)

        # Copies some parameters onto itself for usage in other functions
        self.master: CharacterWindow = master
        self.position = position
        self.stat = stat

        # Converts dict values to StringVars for entries
        self.vars = tuple(tk.StringVar(value=v) for v in values.values())

        # Creates format [STAT NAME: ][container][remove stat]

        # Name
        text = ttk.Label(self, text=f"{stat.upper()}: ")
        text.grid(column=0, row=0)

        # Container frame for the values
        self.container = ttk.Frame(self)
        self.container.grid(column=1, row=0)

        # Level entry is always there
        self.level = ttk.Entry(self.container, textvariable=self.vars[0])
        self.level.grid(column=1, row=0)

        # Just like the remove button
        self.rem = ttk.Button(self, text="Remove stat",
                              command=self.remStat)
        self.rem.grid(column=3, row=0)

        # If leveling to oblivion
        if Main.LTO:
            # Labels must be created to avoid confusion
            ttk.Label(self.container, text="level: ").grid(column=0, row=0)
            ttk.Label(self.container, text="exp: ").grid(column=0, row=1)
            ttk.Label(self.container, text="exp to next lvl: ").grid(
                column=0, row=2)

            # Just like entries for experience-related values
            self.exp = ttk.Entry(self.container, textvariable=self.vars[1])
            self.exp.grid(column=1, row=1)
            self.expToNextLvl = ttk.Entry(
                self.container, textvariable=self.vars[2])
            self.expToNextLvl.grid(column=1, row=2)

    # Deletes stat object with every occurrence it might have and frees its position

    def remStat(self):
        self.master.used.remove(self.position)
        self.master.stats.pop(self.stat, None)
        self.master.statsValues.pop(self.stat, None)
        self.destroy()

    @property
    def val(self):
        # Uses everything if leveling to oblivion, else only the level and creates substitutes
        for el in (self.level, self.exp if Main.LTO else tk.StringVar(value="1"), self.expToNextLvl if Main.LTO else tk.StringVar(value="1")):
            # Quick error check
            if not el.get().isnumeric():
                tkinter.messagebox.showerror("Error", f"{el} must be a number")
                return
        # Converts stat's values to a dict in dice rolling format
        return {"level": int(self.level.get()), "experience": 0, "expToNextLvl": int(self.level.get())*2} if not Main.LTO else {"level": int(self.level.get()), "experience": int(self.exp.get()), "expToNextLvl": int(self.expToNextLvl.get())}


# Short for character button
class CharButt(tk.Frame):
    def __init__(self, master: tk.Misc | None = ..., *, name=..., position=..., **kwargs) -> None:
        super().__init__(master, **kwargs)
        # Again, lets other parts access the init params
        self.name = name
        self.position = position
        # Creates button for character window creation
        self.button = ttk.Button(self, text=name, command=partial(
            CharacterWindow, self, charName=name))

        # And makes removing character possible
        self.rem = ttk.Button(self, text="Remove character",
                              command=self.remChar)

        # Putting these on the visual
        self.button.grid(column=0, row=0)
        self.rem.grid(column=1, row=0)

    def remChar(self):
        # Asks you if you are sure about removing your character, then, if you are, removes every occurrence of them and destroys itself+
        if tkinter.messagebox.askokcancel("Remove character", f"Are you sure to remove character {self.name}? You cannot undo this action."):
            Main.usedCH.remove(self.position)
            Main.state["characters"].pop(self.name, None)
            self.destroy()


class Main(tk.Tk):

    # Holds the state
    state: defaultdict[str, tk.IntVar |
                       list | dict] = defaultdict(tk.IntVar)
    # Not setting it will cause problems when creating characters without importing
    state["characters"] = {}
    state["items"] = {}
    state["stats"] = []
    state["inventory"] = []
    # Holds used places
    usedCH = []
    usedIT = []

    def __init__(self) -> None:
        # Sets whether user is leveling to oblivion, then creates main window
        Main.LTO = tkinter.messagebox.askyesno(
            "Question", "Are you levelling to oblivion?")
        super().__init__()

        self.title("State manager")

        # Holds current page user is on for switch()
        self.current = "options"

        # Holds CharButt objects
        self.charButts = {}

        self.createWidgets()

        # Code to ask whether user is certain to quit
        def quit():
            if tkinter.messagebox.askokcancel("Quit", "Are you sure you want to exit? Changes to your state will be lost if you don't set them."):
                self.destroy()
        self.protocol("WM_DELETE_WINDOW", quit)

    # Just like in character window, gets the first free position
    def getCharacterPosition(self):
        position = 0
        while position < len(Main.usedCH):
            if position not in Main.usedCH:
                break
            position += 1
        Main.usedCH.append(position)
        return position

    def getItemPosition(self):
        position = 0
        while position < len(Main.usedIT):
            if position not in Main.usedIT:
                break
            position += 1
        Main.usedIT.append(position)
        return position

    def readJson(self):
        # Sets json values to Main.state
        with open("state.txt", "r") as f:
            for key, value in dict(json.loads(f.readline())).items():
                if key in ignoredValues:
                    continue
                # Object values
                elif key in objectValues:
                    Main.state[key] = value
                # Int values
                else:
                    Main.state[key].set(value)

        # Creates buttons for characters
        for name in Main.state["characters"]:
            if name in self.charButts:
                continue
            pos = self.getCharacterPosition()
            self.charButts[name] = CharButt(
                self.charactersField, name=name, position=pos)
            self.mids["characters"].winfo_children()[0].create_window(
                0, 45*pos, anchor=tk.NW, window=self.charButts[name])

            self.mids["characters"].winfo_children()[0].configure(
                scrollregion=self.mids["characters"].winfo_children()[0].bbox("all"))

    def switch(self, next: str):
        if self.current == next:
            return

        self.mids[self.current].grid_forget()
        self.mids[next].grid(column=0, row=0)
        self.current = next

    def createWidgets(self):
        # Values at the top
        top = ttk.Frame(self)
        top.grid(column=0, row=0)

        # Creating category switch buttons
        categories = ttk.Frame(top)
        optionsButton = ttk.Button(categories, text="Options",
                                   command=lambda: self.switch("options"))

        charactersButton = ttk.Button(categories, text="Characters",
                                      command=lambda: self.switch("characters"))

        itemsButton = ttk.Button(categories, text="Items",
                                 command=lambda: self.switch("items"))

        # Setting them up
        optionsButton.grid(column=0, row=0)
        charactersButton.grid(column=1, row=0)
        itemsButton.grid(column=2, row=0)
        categories.grid(column=0, row=0)

        # Setting a state getter
        importState = ttk.Button(
            top, text="IMPORT STATE FROM FILE", command=self.readJson)
        importState.grid(column=1, row=0)

        # Container for the edit fields
        mid = ttk.Frame(self)
        mid.grid(column=0, row=1)
        # Option values
        options = ttk.Frame(mid)
        options.grid(column=0, row=0)
        # Creates value objects
        dice = Value(options, "Dice: ", "dice")
        punishment = Value(options, "Punishment: ", "punishment")
        startingHP = Value(options, "Starting HP: ", "startingHP")
        startingLevel = Value(
            options, "Starting Level: ", "startingLevel")
        spOnLevelUp = Value(options, "Skillpoints on level up: ",
                            "skillpointsOnLevelUp")

        # Puts values in a column
        for i, el in enumerate((dice, punishment, startingHP, startingLevel, spOnLevelUp)):
            el.grid(column=0, row=i, sticky=tk.NSEW)

        # Character buttons
        characters = tk.Frame(mid)
        # Creates a canvas
        self.charactersField = tk.Canvas(characters)

        # Enables scrolling
        charactersVSB = ttk.Scrollbar(
            characters, orient=tk.VERTICAL, command=self.charactersField.yview)
        charactersHSB = ttk.Scrollbar(
            characters, orient=tk.HORIZONTAL, command=self.charactersField.xview)

        characters.grid_rowconfigure(0, weight=1)
        characters.grid_columnconfigure(0, weight=1)

        self.charactersField.configure(
            xscrollcommand=charactersHSB.set, yscrollcommand=charactersVSB.set)

        self.charactersField.grid(column=0, row=0, sticky=tk.NSEW)

        charactersVSB.grid(column=1, row=0, sticky=tk.NS)
        charactersHSB.grid(column=0, row=1, sticky=tk.EW)

        self.charactersField.bind("<Configure>", lambda event: self.charactersField.configure(
            scrollregion=self.charactersField.bbox("all")))
        # End

        # Allows for character creation
        self.characterName = ttk.Entry(characters, textvariable=tk.StringVar())
        self.characterCreateButton = ttk.Button(
            characters, command=self.createCharacter, text="Add character")

        self.characterName.grid(column=0, row=2)
        self.characterCreateButton.grid(column=1, row=2)

        # Items frame
        items = tk.Frame(mid)
        # Canvas for the buttons
        self.itemsField = tk.Canvas(items)

        # Enables scrolling
        itemsVSB = ttk.Scrollbar(
            items, orient=tk.VERTICAL, command=self.itemsField.yview)
        itemsHSB = ttk.Scrollbar(
            items, orient=tk.HORIZONTAL, command=self.itemsField.xview)

        items.grid_rowconfigure(0, weight=1)
        items.grid_columnconfigure(0, weight=1)

        self.itemsField.configure(
            xscrollcommand=itemsHSB.set, yscrollcommand=itemsVSB.set)

        self.itemsField.grid(column=0, row=0, sticky=tk.NSEW)

        itemsVSB.grid(column=1, row=0, sticky=tk.NS)
        itemsHSB.grid(column=0, row=1, sticky=tk.EW)

        self.itemsField.bind("<Configure>", lambda event: self.itemsField.configure(
            scrollregion=self.itemsField.bbox("all")))
        # End

        # Allows for item creation
        self.itemName = ttk.Entry(items, textvariable=tk.StringVar())
        self.itemCreateButton = ttk.Button(
            items, command=lambda x: x, text="Add item")

        self.itemName.grid(column=0, row=2)
        self.itemCreateButton.grid(column=1, row=2)

        # Saves containers for switch
        self.mids: dict[str, ttk.Frame | tk.Canvas] = {
            "options": options, "characters": characters, "items": items}

        # Outputting
        bot = ttk.Frame(self)

        # Button calling function for outputting edited data
        ttk.Button(bot, text="GENERATE STATE",
                   command=self.dataOut).grid(column=0, row=0)

        # Simple label
        ttk.Label(bot, text="Your state to copy:").grid(column=0, row=1)

        # Plain Text widget to throw out the value
        self.out = tk.Text(bot, height=5, width=60)
        self.out.insert(tk.END, "Here your state will appear!")
        self.out.config(state=tk.DISABLED)
        self.out.grid(column=0, row=2)

        bot.grid(column=0, row=2)

    def createCharacter(self):
        # Tests te character name against pattern from dice rolling
        pattern = r"^\w[\w\s']+$"
        match = re.match(pattern, self.characterName.get().strip())
        # If it fails, lets the user know
        if match is None:
            tkinter.messagebox.showerror(
                "Error", "Invalid name. Valid names must contain at least one non-whitespace character. Allowed characters are numbers, latin letters and apostrophe.")
            return

        # Characters are not converted to lower case
        character = match.group()

        # Checks whether character already exists
        if character in Main.state["characters"]:
            tkinter.messagebox.showerror(
                "Error", "This character already exists")
            return
        # Creates an empty character
        Main.state["characters"][character] = {
            "hp": 100, "isNpc": False, "level": 1, "experience": 0, "expToNextLvl": 2, "skillpoints": 0}

        # Creates a button for the character
        pos = self.getCharacterPosition()
        self.charButts[character] = CharButt(
            self.charactersField, name=character, position=pos)
        self.charactersField.create_window(
            0, 45*pos, anchor=tk.NW, window=self.charButts[character])
        self.charactersField.configure(
            scrollregion=self.charactersField.bbox("all"))
        self.characterName.delete(0, "end")

    def dataOut(self):
        # This part heavily changes the dict, so it works on a copy
        stateCopy = {k: Main.state[k] for k in Main.state}
        # Changes intvars to ints; if user input something different than int, error is shown
        for k, v in stateCopy.items():
            if isinstance(v, tk.IntVar):
                try:
                    stateCopy[k] = int(v.get())
                except tk.TclError:
                    tkinter.messagebox.showerror(
                        "Error", f"Incorrect value in {k} - {k} must be a number!")
                    return

        # Changes the text field's content to dumped object with additional value out
        # working as a sign of usage
        self.out.config(state=tk.NORMAL)
        self.out.delete("1.0", tk.END)
        temp = json.dumps(stateCopy)
        self.out.insert(
            tk.END, temp[:-1]+', "out": "\\nState was set correctly. State created with AID state manager.", "ctxt": " \\n"}')
        self.out.config(state=tk.DISABLED)


if (__name__ == "__main__"):
    root = Main()
    root.mainloop()
