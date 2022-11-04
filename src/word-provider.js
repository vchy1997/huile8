// 单词列表
const vscode = require("vscode");
const { CommandRead } = require("./const");
const path = require("path");
const { localDictionary, addWordTask } = require("./dictionary");
const statusBar = require("./status-bar");

module.exports = class WordProvider {
  constructor(context) {
    this.context = context;
    this.changeTreeDataEmitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.changeTreeDataEmitter.event;
    this.list = [];
  }

  // 清空单词
  clear() {
    this.list = [];
    this.flush();
  }

  // 添加 单词
  push(word) {
    if (this.list.indexOf(word) == -1) {
      this.list.push(word);
      this.flush();
    }
  }

  // 删除单词
  remove(word) {
    this.list = this.list.filter((item) => word != item);
    this.flush();
  }

  // 刷新
  flush() {
    const tree = [];
    let element = {};
    let elementChild = {};
    this.list.sort().forEach((word) => {
      let prefix = word.substr(0, 1);
      if (element.prefix != prefix) {
        element = {
          level: 1,
          prefix,
          children: [],
        };
        tree.push(element);
      }
      elementChild = {
        word,
        level: 2,
        children: [],
      };
      if (word) {
        var dict = localDictionary[word];
        elementChild.children = dict?.translation.split("\n") ?? [];
      }
      element.children.push(elementChild);
    });
    this.tree = tree;

    // 更新列表
    this.changeTreeDataEmitter.fire(undefined);
    statusBar.update("单词分析完毕！");

    // 创建翻译任务
    addWordTask(this.list, () => {
      this.flush();
    });
  }

  // 获取子节点
  getChildren(element) {
    if (!element) {
      return this.tree;
    } else {
      return element.children;
    }
  }

  // 获取元素内容
  getTreeItem(element) {
    if (element?.level == 1) {
      return new WordGroup(element);
    } else if (element?.level == 2) {
      return new WordItemGroup(element.word);
    } else if (typeof element === "object") {
      return new WordGroup(element);
    } else {
      return new WordItemLine(element);
    }
  }
};

// 三级菜单 单词含义
class WordItemLine extends vscode.TreeItem {
  constructor(word) {
    super(word);
  }
}

// 二级菜单:单词
class WordItemGroup extends vscode.TreeItem {
  constructor(word) {
    super(word);
    this.word = word;
    this.data = localDictionary[word];    
    this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
  }
  
  get tooltip() {
    return this.data
      ? this.data.phonetic
        ? [
            `音标：[${this.data.phonetic}}]`,
            `解释：${this.data.translation.replace(/\n/g, "\n　　　")}`,
          ].join("\n")
        : this.data.translation
      : "loading...";
  }
}
// 一级菜单
class WordGroup extends vscode.TreeItem {
  constructor(element) {
    super(element.prefix.toUpperCase());
    this.description = `共${element.children.length}个`;
    this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    this.tooltip = `${element.prefix.toUpperCase()}开头的单词${
      this.description
    }`;
  }
}
