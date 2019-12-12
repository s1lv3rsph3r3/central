const path = require('path');
const fs = require('fs');

function Tree() {
  // max level of the tree structure
  this.maxLevel = 0;

  // node map is a <key, value> store of the path and the node
  this.nodeMap = {};

  // node of the absolute root of the tree
  this.rootNode = null;
}

function Cell(data) {
  this.data = data;
  this.next = null;
}

function Node(absPath) {
  // The parent (can be NULL)
  this.parent = null;

  // The absolute path
  this.path = absPath;

  // The list of child Node(s)
  this.children = [];

  // The current depth in the tree
  this.level = 0;

  Node.prototype.increaseDepthOfChildren = function increaseDepthOfChildren() {
    Object.values(this.children).forEach((c) => {
      const child = c;
      child.level += 1;
      child.increaseDepthOfChildren();
    });
  };
}

const tree = new Tree();

(function start() {
  /*
 * Please note this is vulnerable to cyclic references
 * Assumption is made that there is always a parent until the parent is the same as the previous,
 * in which case we assume that we have reached the root of the filesytem.
 * This is NOT a perfect approach.
 */

  // .root is a file tag to determine the base directory of the entire project
  const rootTag = '.root';

  // Node modules should be ignored as we don't care about the files or code that exist in here
  const nodeModuleDir = 'node_modules';

  // Booleans to determine root of filesystem or baseproject directory
  let hasReachedRoot = false;
  let hasReachedBaseProj = false;

  // Current absolute path of this file
  let currentPath = path.resolve(__dirname);

  // Create a node and add this to the tree
  let node = new Node(currentPath);

  // Update the nodeMap in the tree
  tree.nodeMap[currentPath] = node;

  // Check for the .root tag
  let files = fs.readdirSync(currentPath);
  Object.values(files).forEach((f) => {
    const file = f;
    if (file === rootTag) {
      hasReachedBaseProj = true;
    }
  });

  while (!hasReachedBaseProj && !hasReachedRoot) {
    const temporaryPath = path.resolve(currentPath, '..');
    if (temporaryPath !== currentPath) {
      // New Node
      node = new Node(temporaryPath);

      // Add the Node to the Tree
      tree.nodeMap[temporaryPath] = node;

      // Add the currentPath to the list of children of this new Node
      node.children.push(tree.nodeMap[currentPath]);

      // Update the parent of the currentPath to be the new Node
      tree.nodeMap[currentPath].parent = node;

      // Update the depth for each child in the tree
      const value = tree.nodeMap[currentPath].level + 1;
      tree.nodeMap[currentPath].level = value;
      tree.nodeMap[currentPath].increaseDepthOfChildren();

      // Update the maximum depth of the tree
      tree.maxLevel += 1;

      // Update the currentPath
      currentPath = temporaryPath;

      // Search for a .root tag to determine the base project directory
      files = fs.readdirSync(currentPath);
      let rootExists = false;
      for (let i = 0; i < files.length; i += 1) {
        if (files[i] === rootTag) {
          rootExists = true;
        }
      }

      if (rootExists) {
        // Reached the base project
        hasReachedBaseProj = true;

        // Set the root node as the base project directory
        tree.rootNode = node;
      }
    } else {
      // Reached the furthest up possible (root)
      tree.rootNode = node;
      hasReachedRoot = true;
    }
  }


  // If there is no base project directory then throw an error
  if (!hasReachedBaseProj) {
    throw (new Error('No base project directory found. Are you sure a .root tag exists in your project?'));
  }

  // ERR: Consider how slashes impact a Windows OS?
  const baseDirPath = `${tree.rootNode.path}/`;

  // build down should exclude all files beginning with a dot - not considered directory
  // build down should exclude all files that exist as a symlink - not considered a true directory
  // build down should continue adding to the nodes in the tree to build a full application tree
  // ERR: String.replace for path is not suitable if the path has the same pattern repeated!!
  let head = new Cell(tree.rootNode.path);
  while (head !== null) {
    files = fs.readdirSync(head.data);
    for (let index = 0; index < files.length; index += 1) {
      if (files[index] !== nodeModuleDir && files[index] !== '.git' && files[index] !== '.nyc_output') {
        const dirPath = path.resolve((head.data).replace(baseDirPath, ''), files[index]);
        const isDir = fs.lstatSync(dirPath).isDirectory();

        if (isDir) {
          // Add to the head
          if (head.next === null) {
            head.next = new Cell(dirPath);
          } else {
            // Reach the tail
            let tail = head.next;
            while (tail.next !== null) {
              tail = tail.next;
            }
            tail.next = new Cell(dirPath);
          }
        }
      }
      // Add the file to the tree
      const tempCurrPath = path.resolve(head.data, files[index]);
      node = new Node(tempCurrPath);
      tree.nodeMap[tempCurrPath] = node;
      const tempParentPath = head.data;
      node.parent = tree.nodeMap[tempParentPath];
      (tree.nodeMap[tempParentPath]).children.push(node);
      node.level = node.parent.level + 1;
    }
    head = head.next;
  }
}());


const BRC487 = (function start() {
  const commute = (smartPath) => {
    // Convert smartPath to a slash path
    const parts = smartPath.split('.');
    let slashPath = '';
    for (let index = 0; index < parts.length; index += 1) {
      slashPath += parts[index];
      if (index < parts.length - 1) {
        slashPath += '/';
      }
    }

    // Add entry to list if the absolute path contains the smart path
    const listOfOptions = [];
    Object.keys(tree.nodeMap).forEach((k) => {
      if (k.includes(slashPath)) {
        listOfOptions.push(k);
      }
    });

    if (listOfOptions.length > 1) {
      // ERR: Consider listing the smart path that failed
      // ERR: Consider listing the files that were returned
      throw (new Error('Multiple file resolutions given for the smart path.'));
    }

    if (listOfOptions.length < 1) {
      // ERR: Consider listing the smart path that failed
      throw (new Error('Unable resolve the smart path.'));
    }

    // Return only the filename without the extension
    let positionOfExtension = -1;
    for (let i = listOfOptions[0].length - 1; i >= 0; i -= 1) {
      if (listOfOptions[0].charAt(i) === '.') {
        // The first dot - signifies an extension
        positionOfExtension = i;
        break;
      }
    }

    // If the positionOfExtension is -1 (no extension on the file name) - Accept this behaviour
    if (positionOfExtension === -1) {
      return listOfOptions[0];
    }

    // If the positionOfExtension is 0 (the entire file is an extension (Do not support this format)
    if (positionOfExtension === 0) {
      throw (new Error('File is not supported exception'));
    }

    // Return the required file path
    return listOfOptions[0].substring(0, positionOfExtension);
  };

  return {
    resolve,
  };
}());

module.exports = { BRC487 };
