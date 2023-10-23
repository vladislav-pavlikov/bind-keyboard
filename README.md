# bind-keyboard

<div align="center">
[![npm](https://img.shields.io/npm/v/bind-keyboard.svg)](https://www.npmjs.com/package/bind-keyboard)
[![npm downloads](https://img.shields.io/npm/dm/bind-keyboard.svg?style=for-the-badge)](https://www.npmjs.com/package/bind-keyboard)
[![npm](https://img.shields.io/npm/dt/bind-keyboard.svg?style=for-the-badge)](https://www.npmjs.com/package/bind-keyboard)
[![npm](https://img.shields.io/bundlephobia/minzip/bind-keyboard?style=for-the-badge)](https://bundlephobia.com/result?p=bind-keyboard)
[![Coverage Status](https://img.shields.io/coveralls/github/bluebill1049/bind-keyboard/master?style=for-the-badge)](https://coveralls.io/gitlab/bluebill1049/bind-keyboard?branch=master)

![GitLab (self-managed)](https://img.shields.io/gitlab/license/bind-keyboard%2Fbind-keyboard?link=https%3A%2F%2Fgitlab.com%2Fbind-keyboard%2Fbind-keyboard%2F-%2Fblob%2Fmain%2FLICENSE)

</div>

`bind-keyboard` is a lightweight Typescript library for managing keyboard event bindings and executing callback functions for specific key combinations. It's designed to simplify handling keyboard events in your web applications.

## Features

- Easily bind callback functions to specific key combinations.
- Supports preventing repeated key press events when holding down a key.
- Prevents intercepting key events when typing in input fields.
- Debugging options for different levels of output.

## Installation

You can install the "bind-keyboard" library via npm:

```bash
npm install bind-keyboard
```

## **Usage**

To use "bind-keyboard," you need to create an instance of the **`BindKeyboard`** class. This instance can be used to add and manage keyboard event bindings. Here's a basic example:

```ts
import { BindKeyboard } from "bind-keyboard";

// Create a BindKeyboard instance
const bindKeyboard = new BindKeyboard();

// Add a key binding for ctrl+a
bindKeyboard.add("ctrl+a", (event) => {
  console.log("ctrl+a was pressed");
});
```

## **Examples**

For more usage examples, please refer to the [examples](https://gitlab.com/bind-keyboard/bind-keyboard/) directory in the repository.

## **License**

This project is licensed under the [MIT License](https://gitlab.com/bind-keyboard/bind-keyboard/-/blob/main/LICENSE).
