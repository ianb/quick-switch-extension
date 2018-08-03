let prevTabs = new Map();
let switchHistory = [];

browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === "requestScreenshot") {
    let tabs = await browser.tabs.query({currentWindow: true});
    try {
      return await browser.tabs.sendMessage(tabs[0].id, {type: "getScreenshot"});
    } catch (error) {
      console.error("Error sending message:", String(error));
      await browser.tabs.executeScript(tabs[0].id, {
        file: "tracker.js",
      });
      return await browser.tabs.sendMessage(tabs[0].id, {type: "getScreenshot"});
    }
  } else {
    console.warn("Unexpected message:", message.type);
  }
});

browser.commands.onCommand.addListener(async (name) => {
  console.error(name);
  if (name.startsWith("switch-")) {
    let number = parseInt(name.substr("switch-".length), 10);
    await switchTo(number);
  } else if (name.startsWith("show-")) {
    let number = parseInt(name.substr("show-".length), 10);
    await show(number);
  }
});

async function switchTo(number) {
  let tabs = await browser.tabs.query({currentWindow: true});
  let destTab = tabs[number - 1];
  let lastActive;
  if (!destTab.active) {
    await browser.tabs.update(destTab.id, {active: true});
  }
  if (switchHistory.length && switchHistory[0].id === destTab.id && Date.now() - switchHistory[0].time < 100 && switchHistory[1]) {
    lastActive = switchHistory[1].id;
  }
  // If lastActiver is something, then it's the actual tab that was activated, before the default
  // action took over and changed the active tab
  console.log("switching to", destTab.id, Date.now() - switchHistory[0].time, lastActive, prevTabs.get(number), switchHistory.map(x => x.id).join(":"));
  if (lastActive) {
    console.log("set prev tab", number, lastActive);
    prevTabs.set(number, lastActive);
  } else {
    let prevTab = prevTabs.get(number);
    console.log("got prev tab?", prevTab);
    if (prevTab) {
      await browser.tabs.update(prevTab, {active: true});
    }
  }
}

async function show(number) {
  console.log("got something", number);
  let tabs = await browser.tabs.query({currentWindow: true});
  let destTab = tabs[number - 1];
  let url = await browser.tabs.captureTab(destTab.id);
  await browser.browserAction.openPopup();
}

let lastActiveIndex;

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  switchHistory.unshift({id: tabId, time: Date.now()});
  while (switchHistory.length > 10) {
    switchHistory.pop();
  }
  console.log("new history:", switchHistory.map(x => x.id).join(":"));
  let tab = await browser.tabs.get(tabId);
  lastActiveIndex = tab.index;
  if (tab.index === 0 || lastActiveIndex === 0) {
    try {
      await browser.tabs.sendMessage(tabId, {type: "reset"});
    } catch (error) {
      console.error("Error sending message:", String(error));
      try {
        await browser.tabs.executeScript(tabId, {
          file: "tracker.js",
        });
        await browser.tabs.sendMessage(tabId, {type: "reset"});
      } catch(error) {
        console.error("Error on second attempt to send message:", error);
      }
    }
  }
});
