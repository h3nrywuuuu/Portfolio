#!/bin/zsh
# 双击此文件，在默认浏览器中打开本项目的本机工作台。
setopt NULL_GLOB
cd -- "${0:A:h}" || exit 1

nodes=(
  "${commands[node]}"
  /opt/homebrew/bin/node
  /usr/local/bin/node
  "$HOME"/.nvm/versions/node/*/bin/node(NOn)
  "$HOME"/.local/share/mise/installs/node/*/bin/node(NOn)
  /Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node
)
for runtime in "${nodes[@]}"; do
  if [[ -x "$runtime" ]] && "$runtime" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' 2>/dev/null; then
    "$runtime" scripts/start-studio.mjs
    result=$?
    if (( result != 0 )); then
      read -r '?启动失败，按回车关闭…'
    fi
    exit $result
  fi
done

print '未找到 Node.js 20 或更新版本。请安装 Node.js 后再次双击此文件。'
read -r '?按回车关闭…'
exit 1
