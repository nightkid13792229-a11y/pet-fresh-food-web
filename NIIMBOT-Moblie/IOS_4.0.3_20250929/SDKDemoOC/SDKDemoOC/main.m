//
//  main.m
//  SDKDemoOC
//
//  Created by yu on 2024/6/6.
//

#import <UIKit/UIKit.h>
#import "AppDelegate.h"

int main(int argc, char * argv[]) {
    // 应用程序主函数入口
    NSString * appDelegateClassName;
    @autoreleasepool {
        // 设置可能创建自动释放对象的代码
        appDelegateClassName = NSStringFromClass([AppDelegate class]);
    }
    // 启动应用程序，传入AppDelegate类名
    return UIApplicationMain(argc, argv, nil, appDelegateClassName);
}
