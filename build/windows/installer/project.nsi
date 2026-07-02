Unicode true

####
## Please note: Template replacements don't work in this file. They are provided with default defines like
## mentioned underneath.
## If the keyword is not defined, "wails_tools.nsh" will populate them with the values from ProjectInfo.
## If they are defined here, "wails_tools.nsh" will not touch them. This allows to use this project.nsi manually
## from outside of Wails for debugging and development of the installer.
##
## For development first make a wails nsis build to populate the "wails_tools.nsh":
## > wails build -platform windows/amd64 -nsis
## Then you can call makensis on this file with specifying the path to your binary:
## For a AMD64 only installer:
## > makensis -DARG_WAILS_AMD64_BINARY=..\..\bin\app.exe
## For a ARM64 only installer:
## > makensis -DARG_WAILS_ARM64_BINARY=..\..\bin\app.exe
## For a installer with both architectures:
## > makensis -DARG_WAILS_AMD64_BINARY=..\..\bin\app-amd64.exe -DARG_WAILS_ARM64_BINARY=..\..\bin\app-arm64.exe
####
## The following information is taken from the ProjectInfo file, but they can be overwritten here.
####
## !define INFO_PROJECTNAME    "MyProject" # Default "{{.Name}}"
## !define INFO_COMPANYNAME    "MyCompany" # Default "{{.Info.CompanyName}}"
## !define INFO_PRODUCTNAME    "MyProduct" # Default "{{.Info.ProductName}}"
## !define INFO_PRODUCTVERSION "1.0.0"     # Default "{{.Info.ProductVersion}}"
## !define INFO_COPYRIGHT      "Copyright" # Default "{{.Info.Copyright}}"
###
## !define PRODUCT_EXECUTABLE  "Application.exe"      # Default "${INFO_PROJECTNAME}.exe"
## !define UNINST_KEY_NAME     "UninstKeyInRegistry"  # Default "${INFO_COMPANYNAME}${INFO_PRODUCTNAME}"
####
## !define REQUEST_EXECUTION_LEVEL "admin"            # Default "admin"  see also https://nsis.sourceforge.io/Docs/Chapter4.html
####
!define INFO_PROJECTNAME    "super_folder"
!define INFO_COMPANYNAME    "super_folder"
!define INFO_PRODUCTNAME    "super_folder"
!define PRODUCT_EXECUTABLE  "super_folder.exe"

!define WAILS_WIN10_REQUIRED "此产品仅支持 Windows 10（Server 2016）及以上版本。"
!define WAILS_ARCHITECTURE_NOT_SUPPORTED "当前 Windows 架构不支持安装此产品。"
!define WAILS_INSTALL_WEBVIEW_DETAILPRINT "正在安装：WebView2 运行时"

####
## Include the wails tools
####
!include "wails_tools.nsh"

# The version information for this two must consist of 4 parts
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} 安装程序"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support. https://nsis.sourceforge.io/Reference/ManifestDPIAware
ManifestDPIAware true

!include "MUI.nsh"

!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
!define MUI_WELCOMEPAGE_TITLE "欢迎安装 ${INFO_PRODUCTNAME}"
!define MUI_WELCOMEPAGE_TEXT "安装程序将引导你完成 ${INFO_PRODUCTNAME} 的安装。建议在开始安装前关闭其他应用程序。"
!define MUI_DIRECTORYPAGE_TEXT_TOP "请选择 ${INFO_PRODUCTNAME} 的安装文件夹。"
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "安装完成"
!define MUI_FINISHPAGE_TITLE "${INFO_PRODUCTNAME} 安装完成"
!define MUI_FINISHPAGE_TEXT "${INFO_PRODUCTNAME} 已成功安装到你的电脑。"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

## The following two statements can be used to sign the installer and the uninstaller. The path to the binaries are provided in %1
#!uninstfinalize 'signtool --file "%1"'
#!finalize 'signtool --file "%1"'

Name "${INFO_PRODUCTNAME}"
OutFile "..\..\bin\${INFO_PROJECTNAME}-${ARCH}-installer.exe"
InstallDir "$PROGRAMFILES64\${INFO_COMPANYNAME}\${INFO_PRODUCTNAME}"
ShowInstDetails show

Function .onInit
   !insertmacro wails.checkArchitecture
FunctionEnd

Section
    !insertmacro wails.setShellContext

    !insertmacro wails.webview2runtime

    # Gracefully stop and kill any existing instances/services before overwriting files
    nsExec::ExecToLog 'sc stop super_folder-search'
    nsExec::ExecToLog 'sc stop FileManagerSearch'
    nsExec::ExecToLog 'taskkill /F /IM ${PRODUCT_EXECUTABLE}'
    Sleep 1000

    SetOutPath $INSTDIR

    !insertmacro wails.files

    CreateDirectory "$COMMONAPPDATA\file-manager"
    nsExec::ExecToLog 'icacls "$COMMONAPPDATA\file-manager" /grant Users:(OI)(CI)RX /T /C'

    CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols

    # Register and start the background service with the user-selected path
    nsExec::ExecToLog 'sc delete super_folder-search'
    nsExec::ExecToLog 'sc delete FileManagerSearch'
    Sleep 500
    nsExec::ExecToLog 'sc create super_folder-search binPath= "\"$INSTDIR\${PRODUCT_EXECUTABLE}\" --service" start= auto obj= LocalSystem'
    nsExec::ExecToLog 'sc start super_folder-search'

    !insertmacro wails.writeUninstaller
SectionEnd

Section "uninstall"
    !insertmacro wails.setShellContext

    # Stop and delete the background service
    nsExec::ExecToLog 'sc stop super_folder-search'
    nsExec::ExecToLog 'sc stop FileManagerSearch'
    nsExec::ExecToLog 'taskkill /F /IM ${PRODUCT_EXECUTABLE}'
    nsExec::ExecToLog 'sc delete super_folder-search'
    nsExec::ExecToLog 'sc delete FileManagerSearch'
    Sleep 1000

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}"

    RMDir /r $INSTDIR

    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
