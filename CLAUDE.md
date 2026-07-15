# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## 会话记忆

**重要：** 每次新会话开始时，在回复用户之前，必须先读取 `C:\Users\Lenovo\.claude\projects\C--Users-Lenovo-Documents-test\memory\last-session.md`，并将上次会话摘要作为第一条消息展示给用户。格式如下：

> 📋 **上次我们聊了：**
> （展示 last-session.md 的内容摘要）

然后再询问用户接下来想做什么。

## 用户偏好

- 用户名叫「小d」
- 所有界面文字和回复必须使用**纯简体中文**
- 用户是青海理科 660 分的高考生，报考浙大竺院，编程/AI 零基础
- 解释技术概念时要通俗易懂
