from collections import defaultdict
from email.headerregistry import Group
from functools import partial
from turtle import position
from typing import Any
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.messagebox
import json
import sys
import re

objectValues = ("stats", "characters")
ignoredValues = ("ctxt", "out", "message", "memory")
levelValues = ("level", "experience", "skillpoints", "expToNextLvl")


class CharacterWindow(tk.Toplevel):
    windows: list[str] = []

    def __init__(self, master: tk.Misc | None = ..., *, charName: str = ..., **kwargs) -> None:
        super().__init__(master, **kwargs)
        # Makes sure a copy window doesn't exist atm
        if charName in CharacterWindow.windows:
            self.destroy()
            return
        self.used = []
        self.charName = charName
        CharacterWindow.windows.append(charName)

        self.title(charName)
        self.stats: defaultdict[str, tk.StringVar | dict] = defaultdict(
            tk.StringVar, {k: tk.StringVar(value=v) if not isinstance(v, dict) else v for k, v in Main.state["characters"][charName].items()}.items())

        self.geometry("700x300")

        # Enabling scrolling
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

        contentVSB = ttk.Scrollbar(
            self, orient=tk.VERTICAL, command=self.contentField.yview)
        contentHSB = ttk.Scrollbar(
            self, orient=tk.HORIZONTAL, command=self.contentField.xview)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        self.contentField.configure(
            xscrollcommand=contentHSB.set, yscrollcommand=contentVSB.set)
        self.contentField.grid(column=0, row=0, sticky=tk.NSEW)
        contentVSB.grid(column=1, row=0, sticky=tk.NS)
        contentHSB.grid(column=0, row=1, sticky=tk.EW)
        self.contentField.bind("<Configure>", lambda event: self.contentField.configure(
            scrollregion=self.contentField.bbox("all")))

        mod = 1.5 if Main.LTO else 1
        self.statsValues: dict[str, Value] = {}
        for i, (stat, val) in enumerate(self.stats.items()):
            if stat in levelValues and Main.LTO:
                continue
            pos = self.getPosition()
            self.statsValues[stat] = Value(
                self, stat, textvar=val, position=pos) if isinstance(val, tk.StringVar)\
                else Stat(self, stat, values=val, position=pos)
            self.contentField.create_window(
                0, 45*mod*pos, anchor=tk.NW, window=self.statsValues[stat])

        self.statName = ttk.Entry(self, textvariable=tk.StringVar())
        self.statCreateButton = ttk.Button(
            self, command=self.createStat, text="Add stat")
        self.statName.grid(column=0, row=2)
        self.statCreateButton.grid(column=1, row=2)

        self.protocol("WM_DELETE_WINDOW", self.close)

    def createStat(self):
        mod = 1.5 if Main.LTO else 1
        pattern = r"^\w[\w ']+$"
        match = re.match(pattern, self.statName.get().strip())
        if match is None:
            tkinter.messagebox.showerror(
                "Error", "Invalid name. Valid names must contain at least one non-whitespace character. Allowed characters are numbers, latin letters and apostrophe.")
            return
        stat = match.group()
        if stat in levelValues and Main.LTO:
            tkinter.messagebox.showerror(
                "Error", "You cannot override default parameters of a character. Maybe you're using the wrong mode?")
            return
        if stat in self.statsValues:
            tkinter.messagebox.showerror(
                "Error", "Stat already exists in this character.")
            return
        pos = self.getPosition()
        self.statsValues[stat] = Stat(
            self, stat, values={"level": 1, "experience": 0, "expToNextLevel": 2}, position=pos)
        self.contentField.create_window(
            0, 45*mod*pos, anchor=tk.NW, window=self.statsValues[stat])
        self.statName.delete(0, "end")

    def close(self):
        for statVal in self.statsValues:
            if self.statsValues[statVal].val is None:
                return
            self.stats[statVal] = int(self.statsValues[statVal].val.get()) if isinstance(
                self.statsValues[statVal].val, ttk.Entry) else self.statsValues[statVal].val
        CharacterWindow.windows.remove(self.charName)
        Main.state["characters"][self.charName] = self.stats
        self.destroy()

    def getPosition(self):
        position = 0
        while position < len(self.used):
            if position not in self.used:
                break
            position += 1
        self.used.append(position)
        return position


class Value(ttk.Frame):
    def __init__(self, master: CharacterWindow = ..., text="", key: str = None, textvar: tk.StringVar = ..., position=...) -> None:
        super().__init__(master)
        self.master: CharacterWindow = master
        self.position = position
        textvar = Main.state[key] if textvar == ... else textvar
        self.text = ttk.Label(self, text=text)
        self.val = ttk.Entry(
            self, textvariable=textvar)
        self.text.grid(column=0, row=0)
        self.val.grid(column=1, row=0)


class Stat(ttk.Frame):
    def __init__(self, master: CharacterWindow = ..., stat: str = "", *, values: dict = ..., position=..., **kwargs) -> None:
        if stat not in Main.state["stats"]:
            Main.state["stats"].append(stat)
        super().__init__(master, **kwargs)
        self.master: CharacterWindow = master
        self.position = position
        self.stat = stat
        text = ttk.Label(self, text=f"{stat.upper()}: ")
        text.grid(column=0, row=0)
        self.vars = tuple(tk.IntVar(value=v) for v in values.values())
        self.container = ttk.Frame(self)
        self.container.grid(column=1, row=0)
        self.level = ttk.Entry(self.container, textvariable=self.vars[0])
        self.level.grid(column=1, row=0)
        self.rem = ttk.Button(self, text="Remove stat",
                              command=self.remStat)
        if Main.LTO:
            ttk.Label(self.container, text="level: ").grid(column=0, row=0)
            ttk.Label(self.container, text="exp: ").grid(column=0, row=1)
            ttk.Label(self.container, text="exp to next lvl: ").grid(
                column=0, row=2)
            self.exp = ttk.Entry(self.container, textvariable=self.vars[1])
            self.exp.grid(column=1, row=1)
            self.expToNextLvl = ttk.Entry(
                self.container, textvariable=self.vars[2])
            self.expToNextLvl.grid(column=1, row=2)
            self.rem.grid(column=3, row=0)
        else:
            self.rem.grid(column=3, row=0)

    def remStat(self):
        self.master.used.remove(self.position)
        self.master.stats.pop(self.stat, None)
        self.master.statsValues.pop(self.stat, None)
        self.destroy()

    @property
    def val(self):
        for el in (self.level, self.exp if Main.LTO else tk.StringVar(value="1"), self.expToNextLvl if Main.LTO else tk.StringVar(value="1")):
            if not el.get().isnumeric():
                tkinter.messagebox.showerror("Error", f"{el} must be a number")
                return
        return {"level": int(self.level.get()), "experience": 0, "expToNextLvl": int(self.level.get())*2} if not Main.LTO else {"level": int(self.level.get()), "experience": int(self.exp.get()), "expToNextLvl": int(self.expToNextLvl.get())}


class CharButt(tk.Frame):
    def __init__(self, master: tk.Misc | None = ..., *, name=..., position=..., **kwargs) -> None:
        super().__init__(master, **kwargs)
        self.name = name
        self.position = position
        self.button = ttk.Button(self, text=name, command=partial(
            CharacterWindow, self, charName=name))
        self.rem = ttk.Button(self, text="Remove character",
                              command=self.remChar)
        self.button.grid(column=0, row=0)
        self.rem.grid(column=1, row=0)

    def remChar(self):
        if tkinter.messagebox.askokcancel("Remove character", f"Are you sure to remove character {self.name}? You cannot undo this action."):
            Main.used.remove(self.position)
            Main.state["characters"].pop(self.name, None)
            self.destroy()


class Main(tk.Tk):

    state: defaultdict[str, tk.IntVar |
                       list | dict] = defaultdict(tk.IntVar)
    used = []

    def __init__(self) -> None:
        Main.LTO = tkinter.messagebox.askyesno(
            "Question", "Are you levelling to oblivion?")
        super().__init__()
        self.title("State manager")
        self.current = "options"
        self.charButts = {}

        self.createWidgets()

        def quit():
            if tkinter.messagebox.askokcancel("Quit", "Are you sure you want to exit?"):
                self.destroy()
        self.protocol("WM_DELETE_WINDOW", quit)

    def getPosition(self):
        position = 0
        while position < len(Main.used):
            if position not in Main.used:
                break
            position += 1
        Main.used.append(position)
        return position

    def readJson(self):
        with open("state.txt", "r") as f:
            for key, value in dict(json.loads(f.readline())).items():
                if key in ignoredValues:
                    continue
                elif key in objectValues:
                    Main.state[key] = value
                else:
                    Main.state[key].set(value)

        for name in Main.state["characters"]:
            pos = self.getPosition()
            self.charButts[name] = CharButt(
                self.charactersField, name=name, position=pos)
            self.mids["characters"].winfo_children()[0].create_window(
                0, 45*pos, anchor=tk.NW, window=self.charButts[name])

    def switch(self, next):
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

        # Setting them up
        optionsButton.grid(column=0, row=0)
        charactersButton.grid(column=1, row=0)
        categories.grid(column=0, row=0)

        # Setting a state getter
        importState = ttk.Button(
            top, text="IMPORT STATE FROM FILE", command=self.readJson)
        importState.grid(column=1, row=0)

        mid = ttk.Frame(self)
        mid.grid(column=0, row=1)
        # Option values
        options = ttk.Frame(mid)
        options.grid(column=0, row=0)
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

        characters = tk.Frame(mid)
        self.charactersField = tk.Canvas(characters)
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

        def createCharacter(self: Main):
            pattern = r"^\w[\w ']+$"
            match = re.match(pattern, self.characterName.get().strip())
            if match is None:
                tkinter.messagebox.showerror(
                    "Error", "Invalid name. Valid names must contain at least one non-whitespace character. Allowed characters are numbers, latin letters and apostrophe.")
                return
            character = match.group()
            if character in Main.state["characters"]:
                tkinter.messagebox.showerror(
                    "Error", "This character already exists")
                return

            Main.state["characters"][character] = {
                "hp": 100, "level": 1, "experience": 0, "expToNextLevel": 2, "skillpoints": 0}
            pos = self.getPosition()
            self.charButts[character] = CharButt(
                self.charactersField, name=character, position=pos)
            self.charactersField.create_window(
                0, 45*pos, anchor=tk.NW, window=self.charButts[character])
            self.characterName.delete(0, "end")

        self.characterName = ttk.Entry(characters, textvariable=tk.StringVar())
        self.characterCreateButton = ttk.Button(
            characters, command=lambda: createCharacter(self), text="Add character")
        self.characterName.grid(column=0, row=2)
        self.characterCreateButton.grid(column=1, row=2)

        self.mids: dict[str, ttk.Frame | tk.Canvas] = {
            "options": options, "characters": characters}
        # Values at the bottom
        bot = ttk.Frame(self)
        ttk.Button(bot, text="print state",
                   command=self.dataOut).grid(column=0, row=0)
        ttk.Label(bot, text="Your state to copy:").grid(column=0, row=1)
        self.out = tk.Text(bot, height=5, width=60)
        self.out.insert(tk.END, "Here your state will appear!")
        self.out.config(state=tk.DISABLED)
        self.out.grid(column=0, row=2)
        bot.grid(column=0, row=2)

    def dataOut(self):
        stateCopy = {k: Main.state[k] for k in Main.state}
        for k, v in stateCopy.items():
            if isinstance(v, tk.IntVar):
                stateCopy[k] = int(v.get())
        self.out.config(state=tk.NORMAL)
        self.out.delete("1.0", tk.END)
        self.out.insert(tk.END, json.dumps(stateCopy))
        self.out.config(state=tk.DISABLED)


if (__name__ == "__main__"):
    root = Main()
    root.mainloop()