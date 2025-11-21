//
//  AppDelegate.m
//  SDKDemoOC
//
//  Created by yu on 2024/6/6.
//

#import "AppDelegate.h"

@interface AppDelegate ()

@end

@implementation AppDelegate

// 应用程序启动完成时调用
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // 应用程序启动后的自定义点
    return YES;
}

#pragma mark - UISceneSession lifecycle

// 为连接场景会话创建配置
- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options  API_AVAILABLE(ios(13.0)){
    // 当创建新场景会话时调用
    // 使用此方法选择要创建新场景的配置
    return [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
}

// 用户丢弃场景会话时调用
- (void)application:(UIApplication *)application didDiscardSceneSessions:(NSSet<UISceneSession *> *)sceneSessions  API_AVAILABLE(ios(13.0)){
    // 当用户丢弃场景会话时调用
    // 如果应用程序未运行时丢弃了任何会话，这将在application:didFinishLaunchingWithOptions后不久调用
    // 使用此方法释放特定于丢弃场景的任何资源，因为它们不会返回
}

@end
