//go:build !windows

package winidentity

import "errors"

func Available() bool {
	return false
}

func Verify() (bool, error) {
	return false, errors.New("当前设备暂不支持 Windows 身份验证重设")
}
