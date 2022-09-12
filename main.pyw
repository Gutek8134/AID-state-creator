from collections import defaultdict
from functools import partial
from typing import Any
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.messagebox
import json

objectValues = ["stats", "characters"]
ignoredValues = ["ctxt", "out", "message", "memory"]


class Value(ttk.Frame):
    def __init__(self, master: tk.Misc | None = ..., text="", key: str = None, textvar: tk.StringVar = ...) -> None:
        super().__init__(master)
        textvar = Main.state[key] if textvar == ... else textvar
        self.text = ttk.Label(self, text=text)
        self.val = ttk.Entry(
            self, textvariable=textvar)
        self.text.grid(column=0, row=0)
        self.val.grid(column=1, row=0)


class CharacterWindow(tk.Toplevel):
    windows: list[str] = []

    def __init__(self, master: tk.Misc | None = ..., cnf: dict[str, Any] | None = ..., *, charName: str = ..., **kwargs) -> None:
        super().__init__(master, **kwargs)
        if charName in CharacterWindow.windows:
            self.destroy()
            return
        CharacterWindow.windows.append(charName)
        print(CharacterWindow.windows)
        self.title(charName)
        self.stats: defaultdict[str, tk.StringVar] = defaultdict(
            tk.StringVar, {k: tk.StringVar(value=v) for k, v in Main.state["characters"][charName].items()}.items())

        self.geometry("300x300")
        self.statsValues: dict[str, Value] = {}
        # hp = Value(self, "HP: ", textvar=CharacterWindow.stats["hp"])
        # hp.grid(column=0, row=0)
        for i, (stat, val) in enumerate(self.stats.items()):
            self.statsValues[stat] = Value(
                self, f"{stat.upper()}: ", textvar=val)
            self.statsValues[stat].grid(column=0, row=i)

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
        bot.grid(column=0, row=2)


if (__name__ == "__main__"):
    root = Main()
    root.mainloop()
