
const HelperFunction = (function start() {
  const build = () => {
    function Node(absPath) {
      // The parent (can be NULL)
      this.parent;

      // The absolute path
      this.path = absPath;

      // The list of child Node(s)
      this.children = [];

      // The current depth in the tree
      this.level = 0;

      Node.prototype.increaseDepthOfChildren = function () {
        for (index in this.children) {
          this.children[index].level += 1;
          this.children[index].increaseDepthOfChildren();
        }
      };
    }


    function Tree() {
      // max level of the tree structure
      this.maxLevel = 0;

      // node map is a <key, value> store of the path and the node
      this.nodeMap = {};

      // node of the absolute root of the tree
      this.rootNode;
    }


    function Cell(data) {
      this.data = data;
      this.next = null;
    }


    /*
 * Please note this is vulnerable to cyclic references
 * Assumption is made that there is always a parent until the parent is the same as the previous,
 * in which case we assume that we have reached the root of the filesytem.
 * This is NOT a perfect approach.
 */

    // .root is a file tag to determine the base directory of the entire project
    const rootTag = '.root';

    // .config tag is a file tag to determine the config directory of the project
    const configTag = '.config';

    // Node modules should be ignored as we don't care about the files or code that exist in here
    const nodeModuleDir = 'node_modules';

    // Booleans to determine root of filesystem or baseproject directory
    let hasReachedRoot = false;
    let hasReachedBaseProj = false;

    const fs = require('fs');
    const path = require('path');

    // create a tree
    const tree = new Tree();

    const listOfFiles = [];
    let currentPath = path.resolve(__dirname);

    // Create a node and add this to the tree
    let node = new Node(currentPath);

    // Update the nodeMap in the tree
    tree.nodeMap[currentPath] = node;

    // Check for the .root tag
    let files = fs.readdirSync(currentPath);
    for (index in files) {
      if (files[index] === rootTag) {
        hasReachedBaseProj = true;
      }
    }

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
        for (index in files) {
          if (files[index] === rootTag) {

            // Reached the base project
            hasReachedBaseProj = true;

            // Set the root node as the base project directory
            tree.rootNode = node;
          }
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
    let head = new Cell(tree.rootNode.path);
    while (head !== null) {
      const files = fs.readdirSync(head.data);
      for (index in files) {
        if (files[index] !== nodeModuleDir && files[index] !== '.git' && files[index] !== '.nyc_output') {
          const dirPath = path.resolve((head.data).replace(baseDirPath, ''), files[index]);
          const isDir = fs.lstatSync(dirPath).isDirectory();
          if (isDir) {
            console.log(dirPath);
            // add to the head
            if (head.next === null) {
              head.next = new Cell(dirPath);
            } else {
              // get to the tail
              let tail = head.next;
              while (tail.next !== null) {
                tail = tail.next;
              }
              tail.next = new Cell(dirPath);
            }
          }
        }
      }
      head = head.next;
    }
  };

  return {
    build,
  };
}());

module.exports = { HelperFunction };
