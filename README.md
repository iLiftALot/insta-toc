# Insta-Toc Plugin
A plugin to dyamically generate and maintain a table of contents while you're writing in real time.

## Demo
![./assets/media/assets/media/demonstration.gif](https://raw.githubusercontent.com/iLiftALot/insta-toc/master/assets/media/demonstration.gif)

## Installation
### **COMING SOON**: Obsidian Community Plugins Tab
*TBD*

### BRAT
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin.
2. Open Obsidian and press SHIFT+CMD+P.
3. Type `>BRAT: Plugins: Add a beta plugin for testing` and select the option.
4. Insert `https://github.com/iLiftALot/insta-toc` and submit.

### Manual
1. Download the [latest release](https://github.com/iLiftALot/insta-toc/releases).
2. Extract the `insta-toc` folder from the zip to your vault's plugins folder: `/path/to/<vault>/.obsidian/plugins/`.
*Note*: On some machines the .obsidian folder may be hidden. On MacOS you should be able to press Command+Shift+Dot to show the folder in Finder.
3. Reload Obsidian.

### npm
```shell
npm install insta-toc
```

## Contributing
- [Report a Bug](https://github.com/iLiftALot/insta-toc/issues/new?assignees=iLiftALot&labels=bug&template=&title=Bug%3A+)
- [Suggest a Feature](https://github.com/iLiftALot/insta-toc/issues/new?assignees=iLiftALot&labels=rule+suggestion&template=&title=FR%3A+)
- [Suggest Documentation](https://github.com/iLiftALot/insta-toc/issues/new?assignees=iLiftALot&labels=documentation&template=&title=Doc%3A+)
- [Submit a Pull Request](https://github.com/iLiftALot/insta-toc/pulls)

## Road Map
- [ ] Implement logic to handle various heading formats
  - [x] Markdown Links
  - [x] Wiki-Links
  - [ ] TBD
- [ ] Configure Settings Tab
  - [x] Indentation
  - [x] Bullet types
    - [x] Number
    - [x] Dash
    - [ ] TBD
  - [x] Update Delay
  - [ ] TBD
- [ ] Add preferences for customized TOC appearance
  - [ ] TBD
- [x] Add folding capabilities
