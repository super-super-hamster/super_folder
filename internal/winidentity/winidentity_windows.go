//go:build windows

package winidentity

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"time"
)

const (
	availabilityScript = `$ErrorActionPreference = 'Stop'
Add-Type -Path "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.WindowsRuntime.dll"
[void][Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
[void][Windows.Security.Credentials.UI.UserConsentVerifierAvailability,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
function Wait-WinRtOperation($operation, [Type]$resultType) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Length -eq 1 -and $_.GetParameters().Length -eq 1 } | Select-Object -First 1
  $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait()
  if ($task.Exception) { throw $task.Exception }
  return $task.Result
}
$result = Wait-WinRtOperation ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
[Console]::Out.Write($result.ToString())`

	verificationScript = `$ErrorActionPreference = 'Stop'
Add-Type -Path "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.WindowsRuntime.dll"
[void][Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
[void][Windows.Security.Credentials.UI.UserConsentVerificationResult,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
function Wait-WinRtOperation($operation, [Type]$resultType) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Length -eq 1 -and $_.GetParameters().Length -eq 1 } | Select-Object -First 1
  $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait()
  if ($task.Exception) { throw $task.Exception }
  return $task.Result
}
$result = Wait-WinRtOperation ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync('验证 Windows 身份以重设隐私密码')) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])
[Console]::Out.Write($result.ToString())`
)

var (
	availabilityOnce sync.Once
	availabilityOK   bool
)

func Available() bool {
	availabilityOnce.Do(func() {
		result, err := runPowerShell(10*time.Second, availabilityScript)
		availabilityOK = err == nil && result == "Available"
	})
	return availabilityOK
}

func Verify() (bool, error) {
	if !Available() {
		return false, errors.New("当前设备暂不支持 Windows 身份验证重设")
	}
	result, err := runPowerShell(2*time.Minute, verificationScript)
	if err != nil {
		return false, fmt.Errorf("Windows 身份验证失败: %w", err)
	}
	if result == "Verified" {
		return true, nil
	}
	return false, fmt.Errorf("Windows 身份验证未通过: %s", verificationResultMessage(result))
}

func runPowerShell(timeout time.Duration, script string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.CombinedOutput()
	text := strings.TrimSpace(string(output))
	if ctx.Err() == context.DeadlineExceeded {
		return "", errors.New("Windows 身份验证超时")
	}
	if err != nil {
		if text != "" {
			return "", fmt.Errorf("%s", text)
		}
		return "", err
	}
	return text, nil
}

func verificationResultMessage(result string) string {
	switch result {
	case "Canceled":
		return "已取消"
	case "DeviceBusy":
		return "验证设备正忙"
	case "DeviceNotPresent":
		return "未找到验证设备"
	case "DisabledByPolicy":
		return "设备策略已禁用验证"
	case "NotConfiguredForUser":
		return "当前用户未配置 Windows Hello 或 PIN"
	case "RetriesExhausted":
		return "尝试次数过多"
	default:
		if result == "" {
			return "不可用"
		}
		return result
	}
}
