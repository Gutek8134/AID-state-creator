from collections import defaultdict
from functools import partial
from typing import Any
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.messagebox
import json
import sys

objectValues = ("stats", "characters")
ignoredValues = ("ctxt", "out", "message", "memory")
levelValues = ("level", "experience", "skillpoints", "expToNextLvl")


class Value(ttk.Frame):
    def __init__(self, master: tk.Misc | None = ..., text="", key: str = None, textvar: tk.StringVar = ...) -> None:
        super().__init__(master)
        textvar = Main.state[key] if textvar == ... else textvar
        self.text = ttk.Label(self, text=text)
        self.val = ttk.Entry(
            self, textvariable=textvar)
        self.text.grid(column=0, row=0)
        self.val.grid(column=1, row=0)


class Stat(ttk.Frame):
    def __init__(self, master: tkinter.Misc | None = ..., text: str = "", *, values: dict = ..., **kwargs) -> None:
        super().__init__(master, **kwargs)
        self.text = ttk.Label(self, text=text)
        self.text.grid(column=0, row=0)
        self.vars = tuple(tk.IntVar(value=v) for v in values.values())
        self.container = ttk.Frame(self)
        self.container.grid(column=1, row=0)
        self.level = ttk.Entry(self.container, textvariable=self.vars[0])
        self.level.grid(column=1, row=0)
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

    @property
    def val(self):
        return tk.Variable(value={"level": self.level.get(), "experience": 0, "expToNextLvl": self.level.get}) if not Main.LTO else tk.Variable(value={"level": self.level.get(), "experience": self.exp.get(), "expToNextLvl": self.expToNextLvl.get()})


class CharacterWindow(tk.Toplevel):
    windows: list[str] = []

    def __init__(self, master: tk.Misc | None = ..., cnf: dict[str, Any] | None = ..., *, charName: str = ..., **kwargs) -> None:
        super().__init__(master, **kwargs)
        if charName in CharacterWindow.windows:
            self.destroy()
            return
        CharacterWindow.windows.append(charName)
        self.title(charName)
        self.stats: defaultdict[str, tk.StringVar | dict] = defaultdict(
            tk.StringVar, {k: tk.StringVar(value=v) if not isinstance(v, dict) else v for k, v in Main.state["characters"][charName].items()}.items())

        self.geometry("700x300")

        # Enabling scrolling
        _on_mousewheel = {"win32": lambda event: contentField.yview_scroll(
            int(-1*(event.delta/120)), "units"), "darwin": lambda event: contentField.yview_scroll(int(event.delta), "units")}
        contentField = tk.Canvas(self)
        if sys.platform != "linux2":
            contentField.bind_all("<MouseWheel>", _on_mousewheel[sys.platform])
        else:
            contentField.bind_all(
                "<Button-4>", lambda event: contentField.yview_scroll(int((event.delta/120)), "units"))
            contentField.bind_all(
                "<Button-5>", lambda event: contentField.yview_scroll(int(-1*(event.delta/120)), "units"))

        contentVSB = ttk.Scrollbar(
            self, orient=tk.VERTICAL, command=contentField.yview)
        contentHSB = ttk.Scrollbar(
            self, orient=tk.HORIZONTAL, command=contentField.xview)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        contentField.configure(
            xscrollcommand=contentHSB.set, yscrollcommand=contentVSB.set)
        contentField.grid(column=0, row=0, sticky=tk.NSEW)
        contentVSB.grid(column=1, row=0, sticky=tk.NS)
        contentHSB.grid(column=0, row=1, sticky=tk.EW)
        contentField.bind("<Configure>", lambda event: contentField.configure(
            scrollregion=contentField.bbox("all")))

        self.statsValues: dict[str, Value] = {}
        mod = 1.5 if Main.LTO else 1
        for i, (stat, val) in enumerate(self.stats.items()):
            if stat in levelValues and Main.LTO:
                continue
            self.statsValues[stat] = Value(
                self, f"{stat.upper()}: ", textvar=val) if isinstance(val, tk.StringVar)\
                else Stat(self, f"{stat.upper()}: ", values=val)
            contentField.create_window(
                0, 45*mod*i, anchor=tk.NW, window=self.statsValues[stat])

        def close(self: CharacterWindow):
            CharacterWindow.windows.remove(charName)
            for statVal in self.statsValues:
                self.stats[statVal] = self.statsValues[statVal].val.get()
            Main.state["characters"][charName] = self.stats
            self.destroy()

        self.protocol("WM_DELETE_WINDOW", lambda: close(self))


class Main(tk.Tk):

    state: defaultdict[str, tk.IntVar |
                       list | dict] = defaultdict(tk.IntVar)

    def __init__(self) -> None:
        Main.LTO = tkinter.messagebox.askyesno(
            "Question", "Are you levelling to oblivion?")
        super().__init__()
        self.title("State manager")
        self.current = "options"

        self.createWidgets()

        def quit():
            if (tkinter.messagebox.askokcancel("Quit", "Are you sure you want to exit?")):
                self.destroy()
        self.protocol("WM_DELETE_WINDOW", quit)

    def readJson(self):
        with open("state.txt", "r") as f:
            for key, value in dict(json.loads(f.readline())).items():
                if key in ignoredValues:
                    continue
                elif key in objectValues:
                    Main.state[key] = value
                else:
                    Main.state[key].set(value)

        for i, name in enumerate(Main.state["characters"]):
            self.mids["characters"].winfo_children()[0].create_window(0, 45*i, anchor=tk.NW,
                                                                      window=ttk.Button(self.mids["characters"], text=name, command=partial(CharacterWindow,
                                                                                                                                            self, charName=name)))

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
        charactersField = tk.Canvas(characters)
        charactersVSB = ttk.Scrollbar(
            characters, orient=tk.VERTICAL, command=charactersField.yview)
        charactersHSB = ttk.Scrollbar(
            characters, orient=tk.HORIZONTAL, command=charactersField.xview)
        characters.grid_rowconfigure(0, weight=1)
        characters.grid_columnconfigure(0, weight=1)
        charactersField.configure(
            xscrollcommand=charactersHSB.set, yscrollcommand=charactersVSB.set)
        charactersField.grid(column=0, row=0, sticky=tk.NSEW)
        charactersVSB.grid(column=1, row=0, sticky=tk.NS)
        charactersHSB.grid(column=0, row=1, sticky=tk.EW)
        charactersField.bind("<Configure>", lambda event: charactersField.configure(
            scrollregion=charactersField.bbox("all")))

        self.mids: dict[str, ttk.Frame | tk.Canvas] = {
            "options": options, "characters": characters}
        # Values at the bottom
        bot = ttk.Frame(self)
        ttk.Button(bot, text="print state", command=lambda: print(
            Main.state)).grid(column=0, row=0)
        bot.grid(column=0, row=2)


if (__name__ == "__main__"):
    root = Main()
    root.mainloop()
