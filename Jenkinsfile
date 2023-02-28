

library identifier: 'project-cicd-libs@master', retriever: modernSCM([
    $class: 'GitSCMSource',
    remote: 'https://github.com/DeltaAdmin/project-cicd-libs.git',
    credentialsId: 'gogul_vvdn'
])



pipeline{


    agent { label'master'}
    
    environment {
       mail_to = "mohammed.nishadh@vvdntech.in"
       cc_to = "sivaselvam.r@vvdntech.in"
       BUILD_USER = ""
   }

   parameters {
       choice(name: 'ENVIRONMENT_NAME', choices: ['DEV'], description: 'Select the environment to be deployed')
   }

    stages{
        stage('Pre-Build') {
		steps {
                script {
                    BUILD_USER=wrap([$class: 'BuildUser']) { return env.BUILD_USER }
                }
                emailNotification('STARTED',"${mail_to}","${cc_to}","${BUILD_USER}","${params.ENVIRONMENT_NAME}")
            }            
        }    
    }
    
    post{
        success{
            script{
		    badge("${BUILD_USER}")
		    build job: 'project-alarmsandevents_CD',
		    parameters: [ string(name: 'GITHUB_BRANCH', value: env.BRANCH_NAME), 
	                          string(name:'CI_WORKSPACE', value: env.WORKSPACE),
	                          string(name:'ENVIRONMENT_NAME', value: env.ENVIRONMENT_NAME)]
            }
	}

	failure{
            emailNotification(currentBuild.result,"${mail_to}","${cc_to}","${BUILD_USER}","${params.ENVIRONMENT_NAME}")
        }
    }
}
