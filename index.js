
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

  Node.prototype.increaseDepthOfChildren = function(){
    for(index in this.children){
      this.children[index].level += 1;
      this.children[index].increaseDepthOfChildren();
    }
  }
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
    // new node
    node = new Node(temporaryPath);
    // add the node to the nodeMap
    tree.nodeMap[temporaryPath] = node;
    // set the path - true
    // update the children with the currentPath
    node.children.push(tree.nodeMap[currentPath]);
    // update the parent of the child with the temporaryPath
    tree.nodeMap[currentPath].parent = node;
    // update the numeric level of the child
    const value = tree.nodeMap[currentPath].level + 1;
    tree.nodeMap[currentPath].level = value;
    tree.nodeMap[currentPath].increaseDepthOfChildren();
    tree.maxLevel += 1;

    // assign to the currentPath
    currentPath = temporaryPath;

    // list the files and find a .root tag
    files = fs.readdirSync(currentPath/* give a path here */);

    for (index in files) {
      if (files[index] === rootTag) {
        // found the root base project
        hasReachedBaseProj = true;
        tree.rootNode = node;
        // current directory has the root tag - base dir of the entire project
        // flag the current absolute path as the root directory of the project
        // keep track of how many steps up and how many steps down to dynamically build the path
      }
    }
  } else {
    // can't travel any further
    // set the root to true
    tree.rootNode = node;
    hasReachedRoot = true;
  }
}

// at each stage of the up process look for a tag to determine the project root
// build the tree down
// at each stage down look for a tag to determine the project config

// set a linked list of places to visit
// get the starting point
// add to the linked list of places to visit
// while the linked list is not empty
// -> set current position to the next item in the list
// -> remove the position from the list
// -> check if it's already been visited
// -> check if it's the target destination (?? not really applicable as we are building not searching)
// -> add a list of directories to the list of places to visit
// -> set the current position as visited

// console.log(tree.rootNode.path);
// tree.rootNode.path is the base directory of the project (starting point)

/* contains absolute path of the directory and pointer to the next cell if applicable */

// let placesToVisit = new LinkedList();
// let head = placesToVisit.add(tree.rootNode.path);

// let filePath = '../../config';
// file needs to be relative based on location from this module... oh dear me - problems

let str = '';
for (let i = 0; i < tree.maxLevel; i++) {
  str += '../';
}

// so if all the paths going in are -
// this should be made better for windows operating system
const test = `${tree.rootNode.path}/`; // use the tree.rootNode.path to make the path to take away
// then remove the start of the path and resolve another way

// build down should exclude all files beginning with a dot - not considered directory
// build down should exclude all files that exist as a symlink - not considered a true directory
// build down should continue adding to the nodes in the tree to build a full application tree
let head = new Cell(tree.rootNode.path);
while (head !== null) {
  const files = fs.readdirSync(head.data);
  for (index in files) {
    if (files[index] !== nodeModuleDir && files[index] !== '.git' && files[index] !== '.nyc_output') {
      let dirPath = path.resolve(str, (head.data).replace(test, ''), files[index]);
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
