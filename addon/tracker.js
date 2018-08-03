let top;
let bottom;
let left;
let right;

function resetBox() {
  top = bottom = left = right = null;
  console.log("Reset Box");
}

function addBox(node) {
  if (!node.offsetHeight) {
    return;
  }
  let box = node.getBoundingClientRect();
  if (box.top >= window.innerHeight + window.scrollY
    || box.bottom <= window.scrollY
    || box.left >= window.innerWidth + window.scrollX
    || box.right <= window.scrollX) {
    return;
  }
  top = top === null ? box.top : Math.min(top, box.top);
  left = left === null ? box.left : Math.min(left, box.left);
  bottom = bottom === null ? box.bottom : Math.max(bottom, box.bottom);
  right = right === null ? box.right : Math.max(right, box.right);
  console.log("Add node", node.tagName, `${left}x${top}–${right}x${bottom}`, "from", `${box.left}x${box.top}–${box.right}x${box.bottom}`);
}

resetBox();

function screenshotBox(box, scale) {
  if (!scale) {
    scale = 1;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  box.width = box.width || box.right - box.left;
  box.height = box.height || box.bottom - box.top;
  let canvasWidth = Math.floor(box.width * scale);
  let canvasHeight = Math.floor(box.height * scale);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  if (scale && scale !== 1) {
    ctx.scale(scale, scale);
  }
  ctx.drawWindow(window, box.left, box.top, box.width, box.height, "#fff");
  return {
    url: canvas.toDataURL(),
    height: canvasHeight,
    width: canvasWidth,
  };
}

browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "reset") {
    resetBox();
  } else if (msg.type === "getScreenshot") {
    if (top === null) {
      console.log("no changes for screenshot");
    }
    top = top === null ? window.scrollY : top;
    bottom = bottom === null ? window.innerHeight + window.scrollY : bottom;
    left = left === null ? window.scrollX : left;
    right = right === null ? window.innerWidth + window.scrollX : right;
    console.log("Return screenshot", `${left}x${top}–${right}x${bottom}`);
    let result = screenshotBox({top, left, width: right - left, height: bottom - top});
    resetBox();
    return result;
  } else {
    console.warn("Got unexpected message:", msg.type);
  }
});

function watchDocument() {
  let observer = new MutationObserver((mutations) => {
    console.log("got some mut", mutations.length);
    for (let m of mutations) {
      console.error("got mutation", JSON.stringify(m));
      if (m.addedNodes && m.addedNodes.length) {
        for (let node of m.addedNodes) {
          addBox(node);
        }
      }
      if (m.previousSibling) {
        addBox(m.previousSibling);
      }
      if (m.nextSibling) {
        addBox(m.nextSibling);
      }
      if (m.type === "childList" && m.removedNodes && m.removedNodes.length && m.target) {
        addBox(m.target);
      }
    }
  });
  // Start observing the target node for configured mutations
  observer.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true,
  });
}

watchDocument();

console.log("Added to 1");
